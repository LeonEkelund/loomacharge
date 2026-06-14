import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  const url = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const admin = createClient(url, serviceKey)

  // 1. Identify the caller from their JWT.
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return json({ error: 'Missing authorization' }, 401)
  const { data: userData, error: userErr } = await admin.auth.getUser(
    authHeader.replace('Bearer ', ''),
  )
  if (userErr || !userData.user) return json({ error: 'Invalid token' }, 401)

  // 2. Only a superadmin may create members.
  const { data: caller } = await admin
    .from('profiles')
    .select('role')
    .eq('id', userData.user.id)
    .single()
  if (caller?.role !== 'superadmin') return json({ error: 'Forbidden' }, 403)

  // 3. Validate input.
  const { email, password, role, org_id } = await req.json().catch(() => ({}))
  if (!email || !password || !['admin', 'viewer'].includes(role) || !org_id) {
    return json({ error: 'email, password, org_id and a valid role are required' }, 400)
  }

  // 4. Create the login.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  })
  if (createErr || !created.user) {
    return json({ error: createErr?.message ?? 'Could not create user' }, 400)
  }

  // 5. Create their profile (org_id + role). Roll back the login if this fails.
  const { error: profileErr } = await admin.from('profiles').insert({
    id: created.user.id,
    email,
    org_id,
    role,
  })
  if (profileErr) {
    await admin.auth.admin.deleteUser(created.user.id)
    return json({ error: profileErr.message }, 400)
  }

  return json({ ok: true }, 200)
})
