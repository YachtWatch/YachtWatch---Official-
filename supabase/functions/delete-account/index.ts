// Supabase Edge Function: delete-account
//
// Permanently deletes the authenticated user's account — BOTH their app-data
// rows AND their Supabase Auth identity — using the service-role key.
//
// Why this exists: a client using the anon key cannot delete its own auth user;
// only the service role can (`auth.admin.deleteUser`). The previous client-only
// flow deleted profile rows and signed out, leaving the auth account alive —
// which fails Apple App Store Guideline 5.1.1(v) (users who create an account
// must be able to initiate full deletion from within the app).
//
// The client (src/contexts/AuthContext.tsx → deleteAccount) invokes this, then
// signs out locally.
//
// Deploy:   supabase functions deploy delete-account
// Runtime env (auto-injected for deployed functions): SUPABASE_URL,
//   SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY. No manual secrets needed.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return json({ error: 'Missing Authorization header' }, 401);
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    // 1. Identify the caller from their own JWT (never trust a user id from the body).
    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: { user }, error: userErr } = await authClient.auth.getUser();
    if (userErr || !user) {
      return json({ error: 'Invalid or expired session' }, 401);
    }
    const userId = user.id;

    // 2. Admin client (service role) — bypasses RLS and can delete auth users.
    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });

    // 3. Delete the user's app data (authoritative, server-side).
    await admin.from('join_requests').delete().eq('user_id', userId);
    await admin.from('vessel_members').delete().eq('user_id', userId);
    await admin.from('crew_secure_data').delete().eq('user_id', userId);
    await admin.from('profiles').delete().eq('id', userId);

    // 4. Delete the Supabase Auth identity itself — the step the old flow missed.
    const { error: delErr } = await admin.auth.admin.deleteUser(userId);
    if (delErr) {
      return json({ error: `Failed to delete auth user: ${delErr.message}` }, 500);
    }

    return json({ success: true }, 200);
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});
