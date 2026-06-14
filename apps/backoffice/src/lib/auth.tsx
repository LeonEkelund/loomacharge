import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import type { Session } from '@loomacharge/db'
import { supabase } from './supabase'

type Profile = { role: 'superadmin' | 'admin' | 'viewer'; org_id: string | null }
type AuthState = { session: Session | null; profile: Profile | null; loading: boolean }

const AuthContext = createContext<AuthState>({ session: null, profile: null, loading: true })

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true

    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s)

      if (!s) {
        setProfile(null)
        setLoading(false)
        return
      }

      // Resolve the profile (role/org) before we consider auth "ready",
      // so role-gated UI renders correctly on the first paint (no flicker).
      supabase
        .from('profiles')
        .select('role, org_id')
        .eq('id', s.user.id)
        .single()
        .then(({ data }) => {
          if (!active) return
          setProfile((data as Profile) ?? null)
          setLoading(false)
        })
    })

    return () => {
      active = false
      sub.subscription.unsubscribe()
    }
  }, [])

  return (
    <AuthContext.Provider value={{ session, profile, loading }}>{children}</AuthContext.Provider>
  )
}

export function useAuth() {
  return useContext(AuthContext)
}
