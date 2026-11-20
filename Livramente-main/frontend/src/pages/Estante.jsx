import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { estanteService } from '../api/services.js'
import { alertaErro, confirmar, toast } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'
import CapaLivro from '../components/CapaLivro.jsx'

const SECOES = [
  { chave: 'quero_ler', titulo: '📌 Quero ler' },
  { chave: 'lendo', titulo: '📖 Lendo' },
  { chave: 'ja_li', titulo: '✅ Já li' },
]
const CATEGORIAS = [
  { valor: 'quero_ler', rotulo: 'Quero ler' },
  { valor: 'lendo', rotulo: 'Lendo' },
  { valor: 'ja_li', rotulo: 'Já li' },
]

export default function Estante() {
  const { usuario } = useAuth()
  const [estantes, setEstantes] = useState({ quero_ler: [], lendo: [], ja_li: [] })
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const r = await estanteService.listar(usuario.id_usuario)
      setEstantes(r.estantes || { quero_ler: [], lendo: [], ja_li: [] })
    } catch (err) {
      alertaErro('Erro ao carregar a estante', err.message)
    } finally {
      setCarregando(false)
    }
  }, [usuario])

  useEffect(() => { carregar() }, [carregar])

  async function mover(idLivro, novaCategoria) {
    try {
      await estanteService.atualizar(usuario.id_usuario, idLivro, novaCategoria)
      toast('Livro movido 📚'); carregar()
    } catch (err) { alertaErro('Erro ao mover', err.message) }
  }

  async function remover(idLivro, titulo) {
    const ok = await confirmar('Remover da estante?', `"${titulo}" será removido da sua estante.`, 'Remover')
    if (!ok) return
    try {
      await estanteService.remover(usuario.id_usuario, idLivro)
      toast('Removido da estante', 'info'); carregar()
    } catch (err) { alertaErro('Erro ao remover', err.message) }
  }

  const total = SECOES.reduce((s, sec) => s + (estantes[sec.chave]?.length || 0), 0)

  if (carregando) return <div className="container pagina"><Carregando /></div>

  return (
    <div className="container pagina">
      <h2 className="pagina-titulo">Minha estante</h2>
      <p className="pagina-sub">Organize suas leituras por categoria.</p>

      {total === 0 ? (
        <div className="vazio">
          <div className="icone">📚</div>
          <p>Sua estante está vazia.</p>
          <Link className="btn btn-primario mt" to="/">Explorar livros</Link>
        </div>
      ) : (
        SECOES.map((sec) => (
          <section key={sec.chave} className="mb">
            <h3 className="pagina-titulo" style={{ fontSize: '1.2rem' }}>
              {sec.titulo} <span className="resenha-meta">({estantes[sec.chave]?.length || 0})</span>
            </h3>
            {(estantes[sec.chave]?.length || 0) === 0 ? (
              <p className="resenha-meta">Nenhum livro aqui.</p>
            ) : (
              <div className="grid-livros">
                {estantes[sec.chave].map((l) => (
                  <div className="livro-card" key={l.id_livro}>
                    <Link to={`/livros/${l.id_livro}`}><CapaLivro livro={l} /></Link>
                    <div className="livro-info">
                      <span className="livro-titulo">{l.titulo}</span>
                      <span className="livro-autor">{l.autor}</span>
                      <div className="campo mt">
                        <select value={sec.chave} onChange={(e) => mover(l.id_livro, e.target.value)} aria-label="Categoria">
                          {CATEGORIAS.map((c) => <option key={c.valor} value={c.valor}>{c.rotulo}</option>)}
                        </select>
                      </div>
                      <button className="btn btn-outline btn-sm mt" onClick={() => remover(l.id_livro, l.titulo)}
                        style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Remover</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        ))
      )}
    </div>
  )
}
