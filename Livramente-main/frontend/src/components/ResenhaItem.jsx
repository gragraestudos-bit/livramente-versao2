import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { curtidaService, comentarioService } from '../api/services.js'
import { alertaErro, confirmar, toast, alertaSemAutorizacao } from '../utils/alertas.js'
import { Estrelas } from './Estrelas.jsx'

// Um item do feed de resenhas, com curtidas e comentários (parte da Ana).
export default function ResenhaItem({ resenha, aoExcluir }) {
  const { usuario, autenticado, ehAdmin } = useAuth()
  const [curtidas, setCurtidas] = useState({ quantidade: 0, usuarios: [] })
  const [comentarios, setComentarios] = useState([])
  const [novoComentario, setNovoComentario] = useState('')
  const [mostrarComentarios, setMostrarComentarios] = useState(false)

  const euCurti = curtidas.usuarios.some((u) => u.id_usuario === usuario?.id_usuario)
  const souDonoResenha = resenha.id_usuario === usuario?.id_usuario

  const carregarCurtidas = useCallback(async () => {
    try { setCurtidas(await curtidaService.daResenha(resenha.id_resenha)) } catch { /* silencioso */ }
  }, [resenha.id_resenha])

  const carregarComentarios = useCallback(async () => {
    try { setComentarios(await comentarioService.daResenha(resenha.id_resenha)) } catch { /* silencioso */ }
  }, [resenha.id_resenha])

  useEffect(() => { carregarCurtidas(); carregarComentarios() }, [carregarCurtidas, carregarComentarios])

  async function alternarCurtida() {
    if (!autenticado) return alertaSemAutorizacao('Entre na sua conta para curtir resenhas.')
    try {
      if (euCurti) await curtidaService.descurtir(resenha.id_resenha)
      else await curtidaService.curtir(resenha.id_resenha)
      carregarCurtidas()
    } catch (err) { alertaErro('Erro ao curtir', err.message) }
  }

  async function enviarComentario(e) {
    e.preventDefault()
    if (!autenticado) return alertaSemAutorizacao('Entre na sua conta para comentar.')
    if (!novoComentario.trim()) return
    try {
      await comentarioService.publicar(resenha.id_resenha, novoComentario.trim())
      setNovoComentario(''); toast('Comentário publicado'); carregarComentarios()
    } catch (err) { alertaErro('Erro ao comentar', err.message) }
  }

  async function excluirComentario(idComentario) {
    const ok = await confirmar('Excluir comentário?', '', 'Excluir')
    if (!ok) return
    try {
      await comentarioService.excluir(idComentario)
      toast('Comentário excluído', 'info'); carregarComentarios()
    } catch (err) { alertaErro('Erro ao excluir', err.message) }
  }

  return (
    <div className="resenha">
      <div className="resenha-topo">
        <div>
          <span className="resenha-autor">{resenha.nome}{souDonoResenha ? ' (você)' : ''}</span>
          {resenha.titulo && (
            <div className="resenha-meta">sobre <Link to={`/livros/${resenha.id_livro}`}>{resenha.titulo}</Link></div>
          )}
        </div>
        <Estrelas nota={resenha.nota} />
      </div>

      <p className="resenha-texto">{resenha.texto}</p>

      <div className="resenha-acoes">
        <button className={`curtir-btn ${euCurti ? 'ativo' : ''}`} onClick={alternarCurtida}>
          {euCurti ? '❤️' : '🤍'} {curtidas.quantidade}
        </button>
        <button className="curtir-btn" onClick={() => setMostrarComentarios((v) => !v)}>
          💬 {comentarios.length} {mostrarComentarios ? 'ocultar' : 'comentários'}
        </button>
        {(souDonoResenha || ehAdmin) && aoExcluir && (
          <button className="curtir-btn" onClick={() => aoExcluir(resenha)} style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>
            🗑️ excluir
          </button>
        )}
      </div>

      {mostrarComentarios && (
        <div className="comentario">
          {comentarios.length === 0 && <p className="resenha-meta">Nenhum comentário ainda.</p>}
          {comentarios.map((c) => (
            <div className="comentario-item" key={c.id_comentario}>
              <b>{c.nome}:</b> {c.texto}
              {(c.id_usuario === usuario?.id_usuario || ehAdmin) && (
                <button className="link" onClick={() => excluirComentario(c.id_comentario)}
                  style={{ color: 'var(--perigo)', background: 'none', border: 'none', cursor: 'pointer', marginLeft: 8, fontSize: '.8rem' }}>
                  excluir
                </button>
              )}
            </div>
          ))}
          {autenticado && (
            <form onSubmit={enviarComentario} style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <input value={novoComentario} onChange={(e) => setNovoComentario(e.target.value)}
                placeholder="Escreva um comentário..." style={{ flex: 1 }} />
              <button className="btn btn-primario btn-sm" type="submit">Enviar</button>
            </form>
          )}
        </div>
      )}
    </div>
  )
}
