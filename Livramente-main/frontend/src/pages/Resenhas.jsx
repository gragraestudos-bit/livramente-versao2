import { useEffect, useState, useCallback } from 'react'
import { resenhaService } from '../api/services.js'
import { alertaErro, confirmar, toast } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'
import ResenhaItem from '../components/ResenhaItem.jsx'

export default function Resenhas() {
  const [resenhas, setResenhas] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try { setResenhas(await resenhaService.listar() || []) }
    catch (err) { alertaErro('Erro ao carregar resenhas', err.message) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function excluir(resenha) {
    const ok = await confirmar('Excluir esta resenha?', 'Essa ação não poderá ser desfeita.', 'Excluir')
    if (!ok) return
    try {
      await resenhaService.excluir(resenha.id_resenha)
      toast('Resenha excluída', 'info'); carregar()
    } catch (err) { alertaErro('Erro ao excluir', err.message) }
  }

  return (
    <div className="container pagina">
      <h2 className="pagina-titulo">Resenhas da comunidade</h2>
      <p className="pagina-sub">Veja o que os leitores estão achando dos livros. Curta e comente!</p>

      {carregando ? (
        <Carregando texto="Carregando resenhas..." />
      ) : resenhas.length === 0 ? (
        <div className="vazio"><div className="icone">📝</div><p>Nenhuma resenha publicada ainda.</p></div>
      ) : (
        resenhas.map((r) => <ResenhaItem key={r.id_resenha} resenha={r} aoExcluir={excluir} />)
      )}
    </div>
  )
}
