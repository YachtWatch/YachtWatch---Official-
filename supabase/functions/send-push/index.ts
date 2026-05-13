import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const APNS_KEY = Deno.env.get('APNS_KEY')!
const APNS_KEY_ID = Deno.env.get('APNS_KEY_ID')!
const APNS_TEAM_ID = Deno.env.get('APNS_TEAM_ID')!
const APNS_BUNDLE_ID = 'com.yachtwatch.ios'
// Use sandbox for development builds, production for App Store/TestFlight
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
    'pkcs8',
    keyData,
    { name: 'ECDSA', namedCurve: 'P-256' },
    false,
    ['sign']
  )

  const signatureBuffer = await crypto.subtle.sign(
    { name: 'ECDSA', hash: 'SHA-256' },
    privateKey,
    new TextEncoder().encode(signingInput)
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
      aps: {
        alert: { title, body },
        sound: 'default',
        'content-available': 1,
      }
    })
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`APNs responded ${res.status}: ${text}`)
  }
}

Deno.serve(async (req) => {
  // Only allow POST
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Validate authorization — must be the Supabase service role key
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const authHeader = req.headers.get('Authorization') ?? ''
  if (!authHeader.startsWith('Bearer ') || authHeader.slice(7) !== serviceRoleKey) {
    console.warn('[send-push] Unauthorized request rejected.')
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  try {
    const { token, title, body } = await req.json()

    if (!token || !title || !body) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: token, title, body' }),
        { status: 400 }
      )
    }

    console.log(`[send-push] Sending "${title}" to token ${token.slice(0, 8)}...`)
    await sendApnsPush(token, title, body)
    console.log(`[send-push] Success.`)

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('[send-push] Error:', err.message)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
