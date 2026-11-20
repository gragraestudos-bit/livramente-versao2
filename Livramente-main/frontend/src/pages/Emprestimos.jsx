import { useEffect, useState, useCallback } from 'react'
import Swal from 'sweetalert2'
import { useAuth } from '../context/AuthContext.jsx'
import { emprestimoService } from '../api/services.js'
import { alertaErro, confirmar, toast } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'

const STATUS_CLASSE = {
  pendente: 'status-pendente', aprovado: 'status-aprovado', devolvido: 'status-devolvido',
  recusado: 'status-recusado', cancelado: 'status-cancelado',
}
const STATUS_ROTULO = {
  pendente: 'Pendente', aprovado: 'Aprovado', devolvido: 'Devolvido',
  recusado: 'Recusado', cancelado: 'Cancelado',
}

function formatarData(d) {
  if (!d) return '—'
  const data = new Date(d)
  if (Number.isNaN(data.getTime())) return '—'
  return data.toLocaleDateString('pt-BR')
}

export default function Emprestimos() {
  const { ehAdmin } = useAuth()
  const [emprestimos, setEmprestimos] = useState([])
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try { setEmprestimos(await emprestimoService.listar() || []) }
    catch (err) { alertaErro('Erro ao carregar empréstimos', err.message) }
    finally { setCarregando(false) }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function aprovar(emp) {
    const hoje = new Date().toISOString().slice(0, 10)
    const { value: data } = await Swal.fire({
      title: 'Aprovar empréstimo',
      text: `Defina a data prevista de devolução para "${emp.titulo_livro}".`,
      input: 'date',
      inputValue: '',
      inputAttributes: { min: hoje },
      showCancelButton: true,
      confirmButtonText: 'Aprovar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#8654C7',
      heightAuto: false,
      inputValidator: (v) => (!v ? 'Informe a data prevista de devolução.' : (v < hoje ? 'A data não pode ser no passado.' : undefined)),
    })
    if (!data) return
    try {
      await emprestimoService.alterarStatus(emp.id_emprestimo, 'aprovado', data)
      toast('Empréstimo aprovado ✅'); carregar()
    } catch (err) { alertaErro('Erro ao aprovar', err.message) }
  }

  async function mudar(emp, status, textoConfirm) {
    const ok = await confirmar(textoConfirm, `Livro: "${emp.titulo_livro}".`)
    if (!ok) return
    try {
      await emprestimoService.alterarStatus(emp.id_emprestimo, status)
      toast('Status atualizado'); carregar()
    } catch (err) { alertaErro('Erro ao atualizar', err.message) }
  }

  if (carregando) return <div className="container pagina"><Carregando /></div>

  return (
    <div className="container pagina">
      <h2 className="pagina-titulo">{ehAdmin ? 'Empréstimos (administração)' : 'Meus empréstimos'}</h2>
      <p className="pagina-sub">
        {ehAdmin ? 'Aprove, recuse ou registre a devolução dos empréstimos.' : 'Acompanhe suas solicitações e empréstimos.'}
      </p>

      {emprestimos.length === 0 ? (
        <div className="vazio"><div className="icone">📕</div><p>Nenhum empréstimo por aqui.</p></div>
      ) : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead>
              <tr>
                {ehAdmin && <th>Usuário</th>}
                <th>Livro</th>
                <th>Status</th>
                <th>Solicitação</th>
                <th>Devolução prevista</th>
                <th>Devolvido em</th>
                <th>Ações</th>
              </tr>
            </thead>
            <tbody>
              {emprestimos.map((e) => (
                <tr key={e.id_emprestimo}>
                  {ehAdmin && <td>{e.nome_usuario}</td>}
                  <td>{e.titulo_livro}</td>
                  <td><span className={`badge ${STATUS_CLASSE[e.status]}`}>{STATUS_ROTULO[e.status]}</span></td>
                  <td>{formatarData(e.data_solicitacao)}</td>
                  <td>{formatarData(e.data_prevista_devolucao)}</td>
                  <td>{formatarData(e.data_devolucao)}</td>
                  <td>
                    <div className="linha-acoes">
                      {ehAdmin && e.status === 'pendente' && (
                        <>
                          <button className="btn btn-primario btn-sm" onClick={() => aprovar(e)}>Aprovar</button>
                          <button className="btn btn-outline btn-sm" onClick={() => mudar(e, 'recusado', 'Recusar esta solicitação?')}
                            style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Recusar</button>
                        </>
                      )}
                      {ehAdmin && e.status === 'aprovado' && (
                        <button className="btn btn-amarelo btn-sm" onClick={() => mudar(e, 'devolvido', 'Registrar devolução?')}>Devolver</button>
                      )}
                      {!ehAdmin && e.status === 'pendente' && (
                        <button className="btn btn-outline btn-sm" onClick={() => mudar(e, 'cancelado', 'Cancelar esta solicitação?')}
                          style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Cancelar</button>
                      )}
                      {(e.status === 'devolvido' || e.status === 'recusado' || e.status === 'cancelado') && <span className="resenha-meta">—</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
