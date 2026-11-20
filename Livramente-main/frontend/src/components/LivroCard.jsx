import { useNavigate } from 'react-router-dom'
import CapaLivro from './CapaLivro.jsx'

// Cartão de livro usado na listagem (página inicial).
export default function LivroCard({ livro }) {
  const navegar = useNavigate()
  return (
    <article className="livro-card" onClick={() => navegar(`/livros/${livro.id_livro}`)}>
      <CapaLivro livro={livro} />
      <div className="livro-info">
        <span className="livro-titulo">{livro.titulo}</span>
        <span className="livro-autor">{livro.autor}</span>
        <span className="livro-genero">{livro.genero}</span>
      </div>
    </article>
  )
}
