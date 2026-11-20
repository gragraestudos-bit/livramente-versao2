// Loader das "três bolinhas que se mexem" (pedido do roteiro) + spinner simples.

export function TresBolinhas() {
  return (
    <div className="tres-bolinhas" role="status" aria-label="Carregando">
      <span className="bolinha" />
      <span className="bolinha" />
      <span className="bolinha" />
    </div>
  )
}

// Loader de página inteira (centralizado).
export function Carregando({ texto = 'Carregando...' }) {
  return (
    <div className="tela-carregando">
      <TresBolinhas />
      <p className="resenha-meta">{texto}</p>
    </div>
  )
}

// Overlay que cobre a tela durante o envio de um formulário (ex.: cadastro).
export function OverlayCarregando({ texto = 'Processando...' }) {
  return (
    <div className="overlay-carregando">
      <TresBolinhas />
      <p className="texto">{texto}</p>
    </div>
  )
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Carregando" />
}
