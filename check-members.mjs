import { createClient } from '@supabase/supabase-js'

const admin = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY)

const { data: orgs } = await admin.from('organizations').select('id, name')
console.log('Organizations:')
for (const o of orgs ?? []) console.log(`  ${o.name}  id=${o.id}`)

const { data: profiles } = await admin.from('profiles').select('id, email, role, org_id')
console.log('\nProfiles:')
for (const p of profiles ?? []) {
  console.log(`  ${p.email}  role=${p.role}  org_id=${p.org_id ?? '(none)'}`)
}
