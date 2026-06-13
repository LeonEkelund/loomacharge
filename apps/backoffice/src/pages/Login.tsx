import { useState } from 'react'
import { horizontalBlack } from '@loomacharge/brand'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { supabase } from '@/lib/supabase'

export function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)

  async function signIn() {
    setBusy(true)
    setMessage('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setMessage(error.message)
    setBusy(false)
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <div className="w-full max-w-sm rounded-xl border bg-card p-8 shadow-sm">
        <img src={horizontalBlack} alt="Looma" className="mx-auto mb-6 h-8" />
        <form
          className="flex flex-col gap-3"
          onSubmit={(e) => {
            e.preventDefault()
            signIn()
          }}
        >
          <Input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <Button type="submit" disabled={busy}>
            {busy ? 'Signing in…' : 'Sign in'}
          </Button>
          {message && <p className="text-sm text-destructive">{message}</p>}
        </form>
      </div>
    </div>
  )
}
