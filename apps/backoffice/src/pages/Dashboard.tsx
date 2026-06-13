import type { Session } from '@loomacharge/db'
import { supabase } from '../lib/supabase'

export function Dashboard({ session }: { session: Session }) {
  return (
    <div style={{ padding: 24 }}>
      <h1>Looma backoffice</h1>
      <p>Logged in as {session.user.email}</p>
      <button onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  )
}
