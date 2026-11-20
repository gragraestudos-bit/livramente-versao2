import { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { alertaErro, alertaSemAutorizacao, toast } from '../utils/alertas.js'
import { OverlayCarregando } from '../components/Loader.jsx'

export default function Login() {
  const { entrar } = useAuth()
  const navegar = useNavigate()
  const local = useLocation()
  const [email, setEmail] = useState('')
  const [senha, setSenha] = useState('')
  const [enviando, setEnviando] = useState(false)

  // Se o usuário foi mandado para cá por tentar acessar algo protegido.
  useEffect(() => {
    if (local.state?.motivo === 'login') {
      alertaSemAutorizacao('Entre na sua conta para acessar essa página.')
    }
  }, [local.state])

  async function aoEnviar(e) {
    e.preventDefault()
    if (!email.trim() || !senha) {
      alertaErro('Dados incompletos', 'Informe e-mail e senha.')
      return
    }
    setEnviando(true)
    try {
      const u = await entrar(email.trim(), senha)
      toast(`Bem-vindo(a), ${u.nome}!`)
      const destino = local.state?.de || '/'
      navegar(destino, { replace: true })
    } catch (err) {
      alertaErro('Não foi possível entrar', err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container pagina">
      {enviando && <OverlayCarregando texto="Entrando..." />}
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="icone">📚</div>
            <h1>Entrar no Livramente</h1>
            <p>Sua biblioteca, suas leituras, suas histórias.</p>
          </div>
          <form className="form" onSubmit={aoEnviar}>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" value={email} autoComplete="email"
                onChange={(e) => setEmail(e.target.value)} placeholder="voce@email.com" />
            </div>
            <div className="campo">
              <label htmlFor="senha">Senha</label>
              <input id="senha" type="password" value={senha} autoComplete="current-password"
                onChange={(e) => setSenha(e.target.value)} placeholder="Sua senha" />
            </div>
            <button className="btn btn-primario btn-bloco" type="submit" disabled={enviando}>
              {enviando ? 'Entrando...' : 'Entrar'}
            </button>
          </form>
          <p className="auth-troca">
            Ainda não tem conta? <Link to="/cadastro">Cadastre-se</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
