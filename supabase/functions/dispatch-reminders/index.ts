import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- APNs config (same as send-push) ---
const APNS_KEY = Deno.env.get('APNS_KEY')!
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')!
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')!
const APNS_BUNDLE_ID = 'com.yachtwatch.ios'
const APNS_HOST = Deno.env.get('APNS_SANDBOX') === 'true'
  ? 'https://api.sandbox.push.apple.com'
  : 'https://api.push.apple.com'

function toBase64url(input: Uint8Array | string): string {
  const str = typeof input === 'string'
    ? input
    : (() => { let s = ''; input.forEach(b => s += String.fromCharCode(b)); return s })()
  return btoa(str).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')
}

async function buildApnsJwt(): Promise<string> {
  const header = toBase64url(JSON.stringify({ alg: 'ES256', kid: APNS_KEY_ID }))
  const payload = toBase64url(JSON.stringify({ iss: APNS_TEAM_ID, iat: Math.floor(Date.now() / 1000) }))
  const signingInput = `${header}.${payload}`
  const pemContents = APNS_KEY
    .replace(/-----BEGIN PRIVATE KEY-----/, '')
    .replace(/-----END PRIVATE KEY-----/, '')
    .replace(/\s+/g, '')
  const keyData = Uint8Array.from(atob(pemContents), c => c.charCodeAt(0))
  const privateKey = await crypto.subtle.importKey(
    'pkcs8', keyData, { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']
  )
  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' }, privateKey, new TextEncoder().encode(signingInput)
  )
  return `${signingInput}.${toBase64url(new Uint8Array(signatureBuffer))}`
}

async function sendApnsPush(token: string, title: string, body: string): Promise<void> {
  const jwt = await buildApnsJwt()
  const res = await fetch(`${APNS_HOST}/3/device/${token}`, {
    method: 'POST',
    headers: {
      'Authorization': `bearer ${jwt}`,
      'apns-topic': APNS_BUNDLE_ID,
      'apns-push-type': 'alert',
      'apns-priority': '10',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      aps: { alert: { title, body }, sound: 'default', 'content-available': 1 }
    })
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`APNs responded ${res.status}: ${text}`)
  }
}

// --- Time helpers ---

/** Format "HH:MM" as "H:MM AM/PM" for notification body */
function formatTime(timeStr: string): string {
  const [h, m] = timeStr.split(':').map(Number)
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${m.toString().padStart(2, '0')} ${ampm}`
}

/**
 * Convert a vessel-local "HH:MM" time to UTC minutes-since-midnight.
 * Uses the classic JS trick of comparing locale strings to derive the offset.
 */
function toUTCMinutes(timeStr: string, tz: string, refDate: Date): number {
  const [h, m] = timeStr.split(':').map(Number)
  const utcMs = new Date(refDate.toLocaleString('en-US', { timeZone: 'UTC' })).getTime()
  const tzMs  = new Date(refDate.toLocaleString('en-US', { timeZone: tz })).getTime()
  const offsetMinutes = (tzMs - utcMs) / 60000          // e.g. +120 for UTC+2
  return ((h * 60 + m) - offsetMinutes + 1440) % 1440
}

/** Returns true if the reminder should fire right now (UTC) */
function isDue(slotStart: string, tz: string, reminderMinutes: number, nowUTCMinutes: number, refDate: Date): boolean {
  if (reminderMinutes <= 0) return false
  const slotUTC = toUTCMinutes(slotStart, tz, refDate)
  const target  = (slotUTC - reminderMinutes + 1440) % 1440
  return target === nowUTCMinutes
}

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  // Must be called with the service role key (pg_cron only)
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== serviceRoleKey) {
    console.warn('[dispatch-reminders] Unauthorized')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  const now = new Date()
  const nowMinutes = now.getUTCHours() * 60 + now.getUTCMinutes()

  try {
    // Fetch all users who have a push token, reminder settings, and an active schedule
    const { data: rows, error } = await admin
      .from('profiles')
      .select('id, push_token, reminder_1, reminder_2, vessel_id, schedules:schedules!vessel_id(slots)')
      .not('push_token', 'is', null)
      .not('vessel_id', 'is', null)
      .or('reminder_1.gt.0,reminder_2.gt.0')

    if (error) throw error

    // Fetch vessel timezones for all unique vessel IDs in one query
    const vesselIds = [...new Set((rows ?? []).map((r: any) => r.vessel_id).filter(Boolean))]
    const { data: vesselRows } = vesselIds.length > 0
      ? await admin.from('vessels').select('id, timezone').in('id', vesselIds)
      : { data: [] }
    const timezoneMap: Record<string, string> = Object.fromEntries(
      (vesselRows ?? []).map((v: any) => [v.id, v.timezone || 'UTC'])
    )

    const pushes: { token: string; title: string; body: string }[] = []

    for (const profile of rows ?? []) {
      const token = profile.push_token as string
      const reminder1 = (profile.reminder_1 as number) || 0
      const reminder2 = (profile.reminder_2 as number) || 0
      const vesselTz = timezoneMap[profile.vessel_id as string] ?? 'UTC'
      const scheduleRows = (profile.schedules as any[]) ?? []
      if (scheduleRows.length === 0) continue

      const slots = scheduleRows[0].slots as Array<{
        id: number
        start: string
        crew: Array<{ userId: string }>
      }>

      for (const slot of slots) {
        const isAssigned = slot.crew?.some((c) => c.userId === profile.id)
        if (!isAssigned) continue

        const watchTime = formatTime(slot.start)

        if (isDue(slot.start, vesselTz, reminder1, nowMinutes, now)) {
          pushes.push({
            token,
            title: 'Watch Reminder',
            body: `Your watch starts in ${reminder1} minute${reminder1 === 1 ? '' : 's'} at ${watchTime}.`,
          })
        }
        // Only send the second reminder if it's a different time to avoid duplicate
        if (reminder2 > 0 && reminder2 !== reminder1 && isDue(slot.start, vesselTz, reminder2, nowMinutes, now)) {
          pushes.push({
            token,
            title: 'Watch Reminder',
            body: `Your watch starts in ${reminder2} minute${reminder2 === 1 ? '' : 's'} at ${watchTime}.`,
          })
        }
      }
    }

    if (pushes.length > 0) {
      await Promise.all(
        pushes.map(p =>
          sendApnsPush(p.token, p.title, p.body).catch(e =>
            console.error(`[dispatch-reminders] Push failed for token ${p.token.slice(0, 8)}...:`, e.message)
          )
        )
      )
    }

    console.log(`[dispatch-reminders] ${now.toISOString()} sent=${pushes.length}`)
    return new Response(JSON.stringify({ sent: pushes.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[dispatch-reminders] Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
