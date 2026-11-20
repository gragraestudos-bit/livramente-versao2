import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { Carregando } from './Loader.jsx'

// Protege rotas que exigem login (e opcionalmente ser administrador).
export default function ProtectedRoute({ children, somenteAdmin = false }) {
  const { autenticado, ehAdmin, carregando } = useAuth()
  const local = useLocation()

  if (carregando) return <Carregando texto="Verificando sua sessão..." />

  if (!autenticado) {
    return <Navigate to="/login" replace state={{ de: local.pathname, motivo: 'login' }} />
  }

  if (somenteAdmin && !ehAdmin) {
    return <Navigate to="/" replace state={{ motivo: 'admin' }} />
  }

  return children
}
