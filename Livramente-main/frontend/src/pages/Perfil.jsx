import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { usuarioService, arquivoService } from '../api/services.js'
import { alertaErro, alertaSucesso, confirmar, toast } from '../utils/alertas.js'
import { OverlayCarregando } from '../components/Loader.jsx'
import Avatar from '../components/Avatar.jsx'

const TAM_MAX = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function Perfil() {
  const { usuario, atualizarUsuarioLocal, sair } = useAuth()
  const navegar = useNavigate()

  const [editando, setEditando] = useState(false)
  const [nome, setNome] = useState(usuario?.nome || '')
  const [email, setEmail] = useState(usuario?.email || '')
  const [novaFoto, setNovaFoto] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [removerFoto, setRemoverFoto] = useState(false)
  const [salvando, setSalvando] = useState(false)

  function escolherFoto(e) {
    const arq = e.target.files?.[0]
    if (!arq) return
    if (!TIPOS.includes(arq.type)) { alertaErro('Imagem inválida', 'Use JPEG, PNG, WEBP ou GIF.'); e.target.value = ''; return }
    if (arq.size > TAM_MAX) { alertaErro('Imagem muito grande', 'O limite é de 5 MB.'); e.target.value = ''; return }
    setNovaFoto(arq)
    setPrevia(URL.createObjectURL(arq))
    setRemoverFoto(false)
  }

  function cancelar() {
    setEditando(false)
    setNome(usuario.nome); setEmail(usuario.email)
    setNovaFoto(null); setPrevia(null); setRemoverFoto(false)
  }

  async function salvar(e) {
    e.preventDefault()
    if (!nome.trim() || !email.trim()) { alertaErro('Dados incompletos', 'Nome e e-mail são obrigatórios.'); return }

    setSalvando(true)
    try {
      const dados = { nome: nome.trim(), email: email.trim() }

      if (novaFoto) {
        const r = await arquivoService.enviar(novaFoto)
        dados.id_foto_perfil = r.id_arquivo
      } else if (removerFoto) {
        dados.id_foto_perfil = null
        dados.foto_perfil = null
      }

      const atualizado = await usuarioService.atualizar(usuario.id_usuario, dados)
      atualizarUsuarioLocal(atualizado)
      await alertaSucesso('Perfil atualizado!', 'Suas informações foram salvas.')
      cancelar()
    } catch (err) {
      alertaErro('Não foi possível salvar', err.message)
    } finally {
      setSalvando(false)
    }
  }

  async function excluirConta() {
    const ok = await confirmar(
      'Excluir sua conta?',
      'Sua conta será removida (exclusão lógica) e você sairá do sistema.',
      'Excluir conta'
    )
    if (!ok) return
    try {
      await usuarioService.excluir(usuario.id_usuario)
      toast('Conta excluída.', 'info')
      sair()
      navegar('/')
    } catch (err) {
      alertaErro('Não foi possível excluir', err.message)
    }
  }

  const usuarioPrevia = previa ? null : (removerFoto ? { nome } : usuario)

  return (
    <div className="container pagina">
      {salvando && <OverlayCarregando texto="Salvando..." />}
      <h2 className="pagina-titulo">Meu perfil</h2>
      <p className="pagina-sub">Gerencie suas informações e sua foto.</p>

      <div className="card">
        {!editando ? (
          <>
            <div className="perfil-cabecalho">
              <Avatar usuario={usuario} />
              <div>
                <h3 style={{ margin: '0 0 4px' }}>{usuario.nome}</h3>
                <p className="resenha-meta" style={{ margin: 0 }}>{usuario.email}</p>
                {usuario.administrador && <span className="badge badge-amarelo mt">Administrador(a)</span>}
              </div>
            </div>
            <div className="linha-acoes mt">
              <button className="btn btn-primario" onClick={() => setEditando(true)}>Editar perfil</button>
              <button className="btn btn-perigo btn-outline" onClick={excluirConta}
                style={{ color: 'var(--perigo)', borderColor: 'var(--perigo)', background: 'transparent' }}>
                Excluir conta
              </button>
            </div>
          </>
        ) : (
          <form className="form" onSubmit={salvar}>
            <div className="perfil-cabecalho">
              {previa
                ? <img src={previa} alt="Prévia" className="perfil-avatar" />
                : <Avatar usuario={usuarioPrevia} />}
              <div className="campo" style={{ flex: 1, minWidth: 220 }}>
                <label htmlFor="foto">Trocar foto</label>
                <input id="foto" type="file" accept="image/*" onChange={escolherFoto} />
                {(usuario.id_foto_perfil || usuario.foto_perfil) && !novaFoto && (
                  <label className="ajuda" style={{ display: 'flex', gap: 6, alignItems: 'center', marginTop: 4 }}>
                    <input type="checkbox" checked={removerFoto} onChange={(e) => { setRemoverFoto(e.target.checked); if (e.target.checked) { setNovaFoto(null); setPrevia(null) } }} />
                    Remover foto atual
                  </label>
                )}
              </div>
            </div>
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" type="text" value={nome} onChange={(e) => setNome(e.target.value)} />
            </div>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="linha-acoes">
              <button className="btn btn-primario" type="submit" disabled={salvando}>Salvar alterações</button>
              <button className="btn btn-outline" type="button" onClick={cancelar}>Cancelar</button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
