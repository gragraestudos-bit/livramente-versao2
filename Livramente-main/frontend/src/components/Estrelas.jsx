// Exibição e seleção de nota (1 a 5 estrelas).
export function Estrelas({ nota = 0 }) {
  return (
    <span className="estrelas" title={`Nota ${nota} de 5`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <span key={n}>{n <= nota ? '★' : '☆'}</span>
      ))}
    </span>
  )
}

export function EstrelasInput({ valor, onChange }) {
  return (
    <span className="estrelas input" role="radiogroup" aria-label="Nota">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          className={n <= valor ? 'cheia' : ''}
          role="radio"
          aria-checked={n === valor}
          tabIndex={0}
          onClick={() => onChange(n)}
          onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && onChange(n)}
        >
          {n <= valor ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}
