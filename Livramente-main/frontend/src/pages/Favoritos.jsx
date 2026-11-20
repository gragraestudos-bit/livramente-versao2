import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { favoritoService } from '../api/services.js'
import { alertaErro, confirmar, toast } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'
import CapaLivro from '../components/CapaLivro.jsx'

export default function Favoritos() {
  const { usuario } = useAuth()
  const [favoritos, setFavoritos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const r = await favoritoService.doUsuario(usuario.id_usuario)
      setFavoritos(r.favoritos || [])
    } catch (err) {
      alertaErro('Erro ao carregar favoritos', err.message)
    } finally {
      setCarregando(false)
    }
  }, [usuario])

  useEffect(() => { carregar() }, [carregar])

  async function remover(idLivro, titulo) {
    const ok = await confirmar('Remover dos favoritos?', `"${titulo}" sairá da sua lista de favoritos.`, 'Remover')
    if (!ok) return
    try {
      await favoritoService.remover(usuario.id_usuario, idLivro)
      toast('Removido dos favoritos', 'info'); carregar()
    } catch (err) { alertaErro('Erro ao remover', err.message) }
  }

  if (carregando) return <div className="container pagina"><Carregando /></div>

  return (
    <div className="container pagina">
      <h2 className="pagina-titulo">Meus favoritos ❤️</h2>
      <p className="pagina-sub">Os livros que você marcou como favoritos.</p>

      {favoritos.length === 0 ? (
        <div className="vazio">
          <div className="icone">🤍</div>
          <p>Você ainda não favoritou nenhum livro.</p>
          <Link className="btn btn-primario mt" to="/">Explorar livros</Link>
        </div>
      ) : (
        <div className="grid-livros">
          {favoritos.map((l) => (
            <div className="livro-card" key={l.id_livro}>
              <Link to={`/livros/${l.id_livro}`}><CapaLivro livro={l} /></Link>
              <div className="livro-info">
                <span className="livro-titulo">{l.titulo}</span>
                <span className="livro-autor">{l.autor}</span>
                <button className="btn btn-outline btn-sm mt" onClick={() => remover(l.id_livro, l.titulo)}
                  style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Remover</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
