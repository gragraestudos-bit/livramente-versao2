import { urlCapa } from '../api/client.js'

// Mostra a capa do livro; se não houver, exibe um marcador com um livro.
export default function CapaLivro({ livro, className = 'livro-capa' }) {
  const src = urlCapa(livro?.capa)
  if (!src) {
    return <div className="livro-capa-vazia" aria-label="Sem capa">📖</div>
  }
  return (
    <img
      className={className}
      src={src}
      alt={`Capa de ${livro?.titulo || 'livro'}`}
      loading="lazy"
      onError={(e) => {
        // Se a imagem falhar, troca pelo marcador.
        e.currentTarget.onerror = null
        e.currentTarget.replaceWith(
          Object.assign(document.createElement('div'), {
            className: 'livro-capa-vazia',
            textContent: '📖',
          })
        )
      }}
    />
  )
}
