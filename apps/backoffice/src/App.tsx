import { Routes, Route, Navigate } from 'react-router'
import { useAuth } from './lib/auth'
import { Layout } from './components/Layout'
import { Login } from './pages/Login'
import { Dashboard } from './pages/Dashboard'
import { Organizations } from './pages/Organizations'
import { Sites } from './pages/Sites'
import { Users } from './pages/Users'
import { Statistics } from './pages/Statistics'
import { Logs } from './pages/Logs'

function App() {
  const { session, loading } = useAuth()

  if (loading) return null
  if (!session) return <Login />

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Dashboard />} />
        <Route path="organizations" element={<Organizations />} />
        <Route path="sites" element={<Sites />} />
        <Route path="users" element={<Users />} />
        <Route path="statistics" element={<Statistics />} />
        <Route path="logs" element={<Logs />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}

export default App
