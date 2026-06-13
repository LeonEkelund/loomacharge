import { useSession } from './lib/useSession'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'

function App() {
  const { session, loading } = useSession()

  if (loading) return <p>Loading…</p>
  if (!session) return <Login />
  return <Dashboard session={session} />
}

export default App
