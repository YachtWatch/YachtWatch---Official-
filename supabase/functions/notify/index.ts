import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// --- APNs config ---
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

// --- Main handler ---
Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 })

  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ')) return new Response('Unauthorized', { status: 401 })

  // Verify the caller is an authenticated Supabase user
  const userClient = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_ANON_KEY')!,
    { global: { headers: { Authorization: authHeader } } }
  )
  const { data: { user }, error: authError } = await userClient.auth.getUser()
  if (authError || !user) return new Response('Unauthorized', { status: 401 })

  // Admin client for reading push tokens
  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  )

  try {
    const { event, targetUserId, vesselId, timezone } = await req.json()
    const pushes: { token: string; title: string; body: string }[] = []

    if (event === 'join_request_submitted' && vesselId) {
      // Notify the vessel captain
      const { data: vessel } = await admin
        .from('vessels')
        .select('captain_id')
        .eq('id', vesselId)
        .single()
      if (vessel?.captain_id) {
        const { data: profile } = await admin
          .from('profiles')
          .select('push_token')
          .eq('id', vessel.captain_id)
          .single()
        if (profile?.push_token) {
          pushes.push({
            token: profile.push_token,
            title: 'New Crew Request',
            body: 'A crew member has requested to join your vessel.',
          })
        }
      }
    } else if (event === 'join_request_approved' && targetUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('push_token')
        .eq('id', targetUserId)
        .single()
      if (profile?.push_token) {
        pushes.push({
          token: profile.push_token,
          title: 'Request Approved!',
          body: "You've been approved to join the vessel.",
        })
      }
    } else if (event === 'join_request_rejected' && targetUserId) {
      const { data: profile } = await admin
        .from('profiles')
        .select('push_token')
        .eq('id', targetUserId)
        .single()
      if (profile?.push_token) {
        pushes.push({
          token: profile.push_token,
          title: 'Request Declined',
          body: 'Your request to join the vessel was not approved.',
        })
      }
    } else if (event === 'timezone_updated' && vesselId && timezone) {
      // Notify all vessel members (including captain) to update their device timezone
      const offset = (() => {
        try {
          const parts = new Intl.DateTimeFormat('en', { timeZone: timezone, timeZoneName: 'shortOffset' }).formatToParts(new Date())
          return parts.find(p => p.type === 'timeZoneName')?.value.replace('GMT', 'UTC') ?? timezone
        } catch { return timezone }
      })()
      const { data: members } = await admin
        .from('vessel_members')
        .select('user_id')
        .eq('vessel_id', vesselId)
      const memberIds = (members ?? [])
        .map((m: any) => m.user_id)
        .filter((id: string) => id !== user.id)
      if (memberIds.length > 0) {
        const { data: profiles } = await admin
          .from('profiles')
          .select('push_token')
          .in('id', memberIds)
        for (const p of profiles ?? []) {
          if (p.push_token) {
            pushes.push({
              token: p.push_token,
              title: 'Timezone Updated',
              body: `Captain has set vessel timezone to ${offset}. Please update your phone in Settings → General → Date & Time.`,
            })
          }
        }
      }
    } else if (event === 'schedule_published' && vesselId) {
      // Notify all crew members on the vessel (skip the sender)
      const { data: members } = await admin
        .from('vessel_members')
        .select('user_id')
        .eq('vessel_id', vesselId)
      if (members && members.length > 0) {
        const memberIds = members
          .map((m: any) => m.user_id)
          .filter((id: string) => id !== user.id)
        if (memberIds.length > 0) {
          const { data: profiles } = await admin
            .from('profiles')
            .select('push_token')
            .in('id', memberIds)
          for (const p of profiles ?? []) {
            if (p.push_token) {
              pushes.push({
                token: p.push_token,
                title: 'Watch Schedule Published',
                body: 'A new watch schedule has been published for your vessel.',
              })
            }
          }
        }
      }
    }

    if (pushes.length > 0) {
      await Promise.all(
        pushes.map(p =>
          sendApnsPush(p.token, p.title, p.body).catch(e =>
            console.error(`[notify] Push failed for token ${p.token.slice(0, 8)}...:`, e.message)
          )
        )
      )
    }

    console.log(`[notify] event=${event} sent=${pushes.length}`)
    return new Response(JSON.stringify({ sent: pushes.length }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[notify] Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
