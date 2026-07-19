import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'

function ProtectedRoute() {
  const { session, loading } = useAuth()

  if (loading) {
    return (
      <p className="text-sm text-slate-500" role="status">
        Loading…
      </p>
    )
  }

  if (!session) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}

export default ProtectedRoute
