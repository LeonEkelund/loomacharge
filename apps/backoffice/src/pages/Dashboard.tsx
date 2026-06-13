import { useAuth } from '@/lib/auth'

export function Dashboard() {
  const { session } = useAuth()

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Signed in as {session?.user.email}
      </p>
    </div>
  )
}
