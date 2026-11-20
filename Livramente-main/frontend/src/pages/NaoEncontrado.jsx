import { Link } from 'react-router-dom'

export default function NaoEncontrado() {
  return (
    <div className="container pagina">
      <div className="vazio">
        <div className="icone" style={{ fontSize: '3.5rem' }}>📭</div>
        <h2 className="pagina-titulo">Página não encontrada</h2>
        <p>O endereço que você tentou acessar não existe.</p>
        <Link className="btn btn-primario mt" to="/">Voltar ao início</Link>
      </div>
    </div>
  )
}
