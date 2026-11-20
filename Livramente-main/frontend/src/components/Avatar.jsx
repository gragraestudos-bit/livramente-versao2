import { urlAvatar } from '../api/client.js'

// Avatar do usuário (foto enviada ou inicial do nome).
export default function Avatar({ usuario, className = 'perfil-avatar', vazioClassName = 'perfil-avatar-vazio' }) {
  const src = urlAvatar(usuario)
  const inicial = (usuario?.nome || '?').trim().charAt(0).toUpperCase()
  if (!src) {
    return <div className={vazioClassName} aria-label={usuario?.nome || 'Usuário'}>{inicial}</div>
  }
  return <img className={className} src={src} alt={usuario?.nome || 'Usuário'} />
}
