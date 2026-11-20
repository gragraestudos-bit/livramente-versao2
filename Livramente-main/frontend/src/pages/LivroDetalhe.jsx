import { useEffect, useState, useCallback } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import {
  livroService, resenhaService, favoritoService, estanteService, emprestimoService,
} from '../api/services.js'
import { alertaErro, alertaSucesso, confirmar, toast, alertaSemAutorizacao } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'
import CapaLivro from '../components/CapaLivro.jsx'
import { Estrelas, EstrelasInput } from '../components/Estrelas.jsx'

const CATEGORIAS = [
  { valor: 'quero_ler', rotulo: 'Quero ler' },
  { valor: 'lendo', rotulo: 'Lendo' },
  { valor: 'ja_li', rotulo: 'Já li' },
]

export default function LivroDetalhe() {
  const { id } = useParams()
  const navegar = useNavigate()
  const { usuario, autenticado, ehAdmin } = useAuth()

  const [livro, setLivro] = useState(null)
  const [resenhas, setResenhas] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [favoritado, setFavoritado] = useState(false)
  const [categoria, setCategoria] = useState('')
  const [form, setForm] = useState({ texto: '', nota: 0 })
  const [editandoResenha, setEditandoResenha] = useState(false)

  const minhaResenha = resenhas.find((r) => r.id_usuario === usuario?.id_usuario) || null

  const carregar = useCallback(async () => {
    try {
      const [l, rs] = await Promise.all([
        livroService.buscar(id),
        resenhaService.doLivro(id),
      ])
      setLivro(l)
      setResenhas(rs || [])

      if (autenticado) {
        const [fav, est] = await Promise.all([
          favoritoService.doUsuario(usuario.id_usuario).catch(() => ({ favoritos: [] })),
          estanteService.listar(usuario.id_usuario).catch(() => ({ estantes: {} })),
        ])
        setFavoritado((fav.favoritos || []).some((f) => f.id_livro === Number(id)))
        const todas = Object.values(est.estantes || {}).flat()
        const naEstante = todas.find((e) => e.id_livro === Number(id))
        setCategoria(naEstante ? naEstante.categoria : '')
      }
    } catch (err) {
      alertaErro('Erro ao carregar o livro', err.message)
    } finally {
      setCarregando(false)
    }
  }, [id, autenticado, usuario])

  useEffect(() => { carregar() }, [carregar])

  function exigirLogin() {
    alertaSemAutorizacao('Entre na sua conta para usar esta funcionalidade.')
    navegar('/login', { state: { de: `/livros/${id}`, motivo: 'login' } })
  }

  async function alternarFavorito() {
    if (!autenticado) return exigirLogin()
    try {
      if (favoritado) {
        await favoritoService.remover(usuario.id_usuario, livro.id_livro)
        setFavoritado(false); toast('Removido dos favoritos', 'info')
      } else {
        await favoritoService.adicionar(livro.id_livro)
        setFavoritado(true); toast('Adicionado aos favoritos ❤️')
      }
    } catch (err) { alertaErro('Erro nos favoritos', err.message) }
  }

  async function mudarEstante(novaCategoria) {
    if (!autenticado) return exigirLogin()
    try {
      if (!novaCategoria) {
        if (categoria) {
          await estanteService.remover(usuario.id_usuario, livro.id_livro)
          setCategoria(''); toast('Removido da estante', 'info')
        }
        return
      }
      if (categoria) {
        await estanteService.atualizar(usuario.id_usuario, livro.id_livro, novaCategoria)
      } else {
        await estanteService.adicionar(livro.id_livro, novaCategoria)
      }
      setCategoria(novaCategoria)
      toast('Estante atualizada 📚')
    } catch (err) { alertaErro('Erro na estante', err.message) }
  }

  async function solicitarEmprestimo() {
    if (!autenticado) return exigirLogin()
    try {
      await emprestimoService.solicitar(livro.id_livro)
      await alertaSucesso('Solicitação enviada!', 'Aguarde a aprovação de um administrador.')
    } catch (err) { alertaErro('Não foi possível solicitar', err.message) }
  }

  async function enviarResenha(e) {
    e.preventDefault()
    if (!autenticado) return exigirLogin()
    if (!form.texto.trim() || !form.nota) { alertaErro('Resenha incompleta', 'Escreva um texto e escolha a nota.'); return }
    try {
      if (editandoResenha && minhaResenha) {
        await resenhaService.editar(minhaResenha.id_resenha, form.texto.trim(), form.nota)
        toast('Resenha atualizada')
      } else {
        await resenhaService.publicar(livro.id_livro, form.texto.trim(), form.nota)
        toast('Resenha publicada ⭐')
      }
      setForm({ texto: '', nota: 0 }); setEditandoResenha(false)
      carregar()
    } catch (err) { alertaErro('Erro na resenha', err.message) }
  }

  function editarMinhaResenha() {
    setEditandoResenha(true)
    setForm({ texto: minhaResenha.texto, nota: minhaResenha.nota })
  }

  async function excluirMinhaResenha() {
    const ok = await confirmar('Excluir sua resenha?', 'Essa ação não poderá ser desfeita.')
    if (!ok) return
    try {
      await resenhaService.excluir(minhaResenha.id_resenha)
      toast('Resenha excluída', 'info'); carregar()
    } catch (err) { alertaErro('Erro ao excluir', err.message) }
  }

  async function excluirLivro() {
    const ok = await confirmar('Excluir este livro?', 'Ele deixará de aparecer no acervo (exclusão lógica).', 'Excluir')
    if (!ok) return
    try {
      await livroService.excluir(livro.id_livro)
      toast('Livro excluído', 'info'); navegar('/')
    } catch (err) { alertaErro('Erro ao excluir', err.message) }
  }

  if (carregando) return <div className="container pagina"><Carregando texto="Carregando livro..." /></div>
  if (!livro) return (
    <div className="container pagina"><div className="vazio"><div className="icone">❓</div><p>Livro não encontrado.</p><Link className="btn btn-primario mt" to="/">Voltar ao acervo</Link></div></div>
  )

  const media = resenhas.length
    ? (resenhas.reduce((s, r) => s + r.nota, 0) / resenhas.length).toFixed(1)
    : null

  return (
    <div className="container pagina">
      <Link to="/" className="btn btn-outline btn-sm mb">← Voltar</Link>

      <div className="card">
        <div style={{ display: 'flex', gap: 26, flexWrap: 'wrap' }}>
          <div style={{ width: 200, flexShrink: 0, margin: '0 auto' }}>
            <CapaLivro livro={livro} className="livro-capa" />
          </div>
          <div style={{ flex: 1, minWidth: 260 }}>
            <h2 className="pagina-titulo" style={{ marginBottom: 2 }}>{livro.titulo}</h2>
            <p className="pagina-sub" style={{ marginBottom: 10 }}>por {livro.autor}</p>
            <span className="livro-genero">{livro.genero}</span>

            <div className="mt" style={{ display: 'flex', gap: 16, flexWrap: 'wrap', fontSize: '.9rem', color: 'var(--texto-suave)' }}>
              {livro.editora && <span>🏢 {livro.editora}</span>}
              {livro.ano_publicacao && <span>📅 {livro.ano_publicacao}</span>}
              {livro.numero_paginas && <span>📄 {livro.numero_paginas} págs.</span>}
              {livro.isbn && <span>🔖 {livro.isbn}</span>}
            </div>

            <p style={{ margin: '10px 0' }}>
              <span className={`badge ${livro.exemplares_disponiveis > 0 ? 'badge-roxo' : 'status-recusado'}`}>
                {livro.exemplares_disponiveis > 0
                  ? `${livro.exemplares_disponiveis} de ${livro.quantidade_exemplares} disponível(is)`
                  : 'Sem exemplares disponíveis'}
              </span>
              {media && <span className="mt" style={{ marginLeft: 10 }}><Estrelas nota={Math.round(media)} /> {media} ({resenhas.length})</span>}
            </p>

            {livro.sinopse && <p style={{ marginTop: 8 }}>{livro.sinopse}</p>}

            <div className="linha-acoes mt">
              <button className={`btn ${favoritado ? 'btn-perigo' : 'btn-outline'}`} onClick={alternarFavorito}>
                {favoritado ? '❤️ Favoritado' : '🤍 Favoritar'}
              </button>
              <button className="btn btn-amarelo" onClick={solicitarEmprestimo}>📕 Solicitar empréstimo</button>
              <div className="campo" style={{ minWidth: 170 }}>
                <select value={categoria} onChange={(e) => mudarEstante(e.target.value)} aria-label="Estante">
                  <option value="">+ Adicionar à estante</option>
                  {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                </select>
              </div>
            </div>

            {ehAdmin && (
              <div className="linha-acoes mt">
                <Link className="btn btn-outline btn-sm" to={`/admin/livros/${livro.id_livro}/editar`}>✏️ Editar livro</Link>
                <button className="btn btn-outline btn-sm" onClick={excluirLivro} style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>🗑️ Excluir</button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* RESENHAS */}
      <h3 className="pagina-titulo mt" style={{ fontSize: '1.3rem' }}>Resenhas</h3>

      {autenticado && (
        <div className="card mb">
          {minhaResenha && !editandoResenha ? (
            <>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--roxo-escuro)' }}>Sua resenha</p>
              <div className="mt"><Estrelas nota={minhaResenha.nota} /></div>
              <p className="resenha-texto">{minhaResenha.texto}</p>
              <div className="linha-acoes">
                <button className="btn btn-outline btn-sm" onClick={editarMinhaResenha}>Editar</button>
                <button className="btn btn-outline btn-sm" onClick={excluirMinhaResenha} style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Excluir</button>
              </div>
            </>
          ) : (
            <form className="form" onSubmit={enviarResenha}>
              <p style={{ margin: 0, fontWeight: 700, color: 'var(--roxo-escuro)' }}>
                {editandoResenha ? 'Editar sua resenha' : 'Escrever uma resenha'}
              </p>
              <div className="campo">
                <label>Sua nota</label>
                <EstrelasInput valor={form.nota} onChange={(n) => setForm((f) => ({ ...f, nota: n }))} />
              </div>
              <div className="campo">
                <label htmlFor="texto">Comentário</label>
                <textarea id="texto" value={form.texto} onChange={(e) => setForm((f) => ({ ...f, texto: e.target.value }))}
                  placeholder="O que você achou do livro?" />
              </div>
              <div className="linha-acoes">
                <button className="btn btn-primario" type="submit">{editandoResenha ? 'Salvar' : 'Publicar resenha'}</button>
                {editandoResenha && <button className="btn btn-outline" type="button" onClick={() => { setEditandoResenha(false); setForm({ texto: '', nota: 0 }) }}>Cancelar</button>}
              </div>
            </form>
          )}
        </div>
      )}

      {resenhas.length === 0 ? (
        <div className="vazio"><div className="icone">📝</div><p>Ainda não há resenhas para este livro.</p></div>
      ) : (
        resenhas.map((r) => (
          <div className="resenha" key={r.id_resenha}>
            <div className="resenha-topo">
              <span className="resenha-autor">{r.nome}{r.id_usuario === usuario?.id_usuario ? ' (você)' : ''}</span>
              <Estrelas nota={r.nota} />
            </div>
            <p className="resenha-texto">{r.texto}</p>
            <p className="resenha-meta">Veja comentários e curtidas na página de <Link to="/resenhas">Resenhas</Link>.</p>
          </div>
        ))
      )}
    </div>
  )
}
