import { useState } from 'react'
import { NavLink, Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { confirmar } from '../utils/alertas.js'
import Avatar from './Avatar.jsx'

export default function Navbar() {
  const { autenticado, ehAdmin, usuario, sair } = useAuth()
  const [aberto, setAberto] = useState(false)
  const navegar = useNavigate()

  const fechar = () => setAberto(false)

  async function aoSair() {
    fechar()
    const ok = await confirmar('Sair da conta?', 'Você precisará entrar novamente para continuar.', 'Sair')
    if (ok) {
      sair()
      navegar('/')
    }
  }

  return (
    <nav className="navbar">
      <div className="container">
        <Link to="/" className="navbar-marca" onClick={fechar}>
          📚 Livra<span>mente</span>
        </Link>

        <button className="navbar-toggle" aria-label="Abrir menu" onClick={() => setAberto((a) => !a)}>☰</button>

        <div className={`navbar-links ${aberto ? 'aberto' : ''}`}>
          <NavLink to="/" end className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Livros</NavLink>
          <NavLink to="/resenhas" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Resenhas</NavLink>

          {autenticado && (
            <>
              <NavLink to="/estante" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Estante</NavLink>
              <NavLink to="/favoritos" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Favoritos</NavLink>
              <NavLink to="/emprestimos" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Empréstimos</NavLink>
              {ehAdmin && (
                <NavLink to="/admin" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Painel</NavLink>
              )}
              <NavLink to="/perfil" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <Avatar usuario={usuario} className="navbar-avatar" vazioClassName="navbar-avatar" />
                  Perfil
                </span>
              </NavLink>
              <button className="link" onClick={aoSair}>Sair</button>
            </>
          )}

          {!autenticado && (
            <>
              <NavLink to="/login" className={({ isActive }) => (isActive ? 'ativo' : '')} onClick={fechar}>Entrar</NavLink>
              <NavLink to="/cadastro" className="btn btn-amarelo btn-sm" onClick={fechar}>Cadastrar</NavLink>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
