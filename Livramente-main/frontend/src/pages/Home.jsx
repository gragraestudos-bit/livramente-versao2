import { useEffect, useMemo, useState } from 'react'
import { livroService } from '../api/services.js'
import { alertaErro } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'
import LivroCard from '../components/LivroCard.jsx'

export default function Home() {
  const [livros, setLivros] = useState([])
  const [carregando, setCarregando] = useState(true)
  const [busca, setBusca] = useState('')

  useEffect(() => {
    let ativo = true
    livroService.listar()
      .then((dados) => { if (ativo) setLivros(dados || []) })
      .catch((err) => alertaErro('Erro ao carregar livros', err.message))
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [])

  const filtrados = useMemo(() => {
    const t = busca.trim().toLowerCase()
    if (!t) return livros
    return livros.filter((l) =>
      [l.titulo, l.autor, l.genero].some((c) => (c || '').toLowerCase().includes(t))
    )
  }, [livros, busca])

  return (
    <div className="container pagina">
      <div className="hero">
        <h1>📚 Explore o acervo</h1>
        <p>Descubra livros, organize suas leituras e compartilhe suas opiniões.</p>
      </div>

      <div className="campo mb" style={{ maxWidth: 420 }}>
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="🔎 Buscar por título, autor ou gênero..."
        />
      </div>

      {carregando ? (
        <Carregando texto="Carregando livros..." />
      ) : filtrados.length === 0 ? (
        <div className="vazio">
          <div className="icone">📭</div>
          <p>{busca ? 'Nenhum livro encontrado para essa busca.' : 'Nenhum livro cadastrado ainda.'}</p>
        </div>
      ) : (
        <div className="grid-livros">
          {filtrados.map((l) => <LivroCard key={l.id_livro} livro={l} />)}
        </div>
      )}
    </div>
  )
}
