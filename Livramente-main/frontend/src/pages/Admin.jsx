import { useEffect, useState, useCallback } from 'react'
import { Link } from 'react-router-dom'
import { livroService, usuarioService, emprestimoService, arquivoService } from '../api/services.js'
import { alertaErro, confirmar, toast, alertaSucesso } from '../utils/alertas.js'
import { Carregando } from '../components/Loader.jsx'

export default function Admin() {
  const [livros, setLivros] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [pendentes, setPendentes] = useState(0)
  const [carregando, setCarregando] = useState(true)

  const carregar = useCallback(async () => {
    try {
      const [ls, us, es] = await Promise.all([
        livroService.listar(),
        usuarioService.listar().catch(() => []),
        emprestimoService.listar().catch(() => []),
      ])
      setLivros(ls || [])
      setUsuarios(us || [])
      setPendentes((es || []).filter((e) => e.status === 'pendente').length)
    } catch (err) {
      alertaErro('Erro ao carregar o painel', err.message)
    } finally {
      setCarregando(false)
    }
  }, [])

  useEffect(() => { carregar() }, [carregar])

  async function excluirLivro(l) {
    const ok = await confirmar('Excluir livro?', `"${l.titulo}" deixará de aparecer no acervo (exclusão lógica).`, 'Excluir')
    if (!ok) return
    try {
      await livroService.excluir(l.id_livro)
      toast('Livro excluído', 'info'); carregar()
    } catch (err) { alertaErro('Erro ao excluir', err.message) }
  }

  async function limparOrfaos() {
    const ok = await confirmar('Limpar arquivos órfãos?', 'Remove imagens que não estão associadas a nenhum usuário.', 'Limpar')
    if (!ok) return
    try {
      const r = await arquivoService.limparOrfaos()
      await alertaSucesso('Limpeza concluída', `${r.removidos} arquivo(s) órfão(s) removido(s).`)
    } catch (err) { alertaErro('Erro na limpeza', err.message) }
  }

  if (carregando) return <div className="container pagina"><Carregando /></div>

  return (
    <div className="container pagina">
      <h2 className="pagina-titulo">Painel administrativo</h2>
      <p className="pagina-sub">Gerencie livros, usuários e empréstimos.</p>

      <div className="grid-livros" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px,1fr))', marginBottom: 24 }}>
        <div className="card center"><h3 style={{ fontSize: '2rem', margin: 0 }}>{livros.length}</h3><p className="resenha-meta">Livros no acervo</p></div>
        <div className="card center"><h3 style={{ fontSize: '2rem', margin: 0 }}>{usuarios.length}</h3><p className="resenha-meta">Usuários ativos</p></div>
        <div className="card center">
          <h3 style={{ fontSize: '2rem', margin: 0 }}>{pendentes}</h3>
          <p className="resenha-meta">Empréstimos pendentes</p>
          <Link className="btn btn-outline btn-sm mt" to="/emprestimos">Gerenciar</Link>
        </div>
      </div>

      <div className="card mb">
        <div className="resenha-topo">
          <h3 className="card-titulo" style={{ margin: 0 }}>📚 Livros</h3>
          <div className="linha-acoes">
            <Link className="btn btn-primario btn-sm" to="/admin/livros/novo">+ Cadastrar livro</Link>
            <button className="btn btn-outline btn-sm" onClick={limparOrfaos}>Limpar imagens órfãs</button>
          </div>
        </div>
        <div className="tabela-rolagem mt">
          <table className="tabela">
            <thead><tr><th>Título</th><th>Autor</th><th>Gênero</th><th>Exemplares</th><th>Ações</th></tr></thead>
            <tbody>
              {livros.map((l) => (
                <tr key={l.id_livro}>
                  <td><Link to={`/livros/${l.id_livro}`}>{l.titulo}</Link></td>
                  <td>{l.autor}</td>
                  <td>{l.genero}</td>
                  <td>{l.exemplares_disponiveis}/{l.quantidade_exemplares}</td>
                  <td>
                    <div className="linha-acoes">
                      <Link className="btn btn-outline btn-sm" to={`/admin/livros/${l.id_livro}/editar`}>Editar</Link>
                      <button className="btn btn-outline btn-sm" onClick={() => excluirLivro(l)}
                        style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)' }}>Excluir</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card">
        <h3 className="card-titulo">👥 Usuários</h3>
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>ID</th><th>Nome</th><th>E-mail</th><th>Perfil</th></tr></thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id_usuario}>
                  <td>{u.id_usuario}</td>
                  <td>{u.nome}</td>
                  <td>{u.email}</td>
                  <td>{u.administrador ? <span className="badge badge-amarelo">Admin</span> : <span className="badge badge-roxo">Comum</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
