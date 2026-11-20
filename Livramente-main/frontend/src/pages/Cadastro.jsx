import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext.jsx'
import { usuarioService, arquivoService } from '../api/services.js'
import { alertaErro, alertaSucesso } from '../utils/alertas.js'
import { OverlayCarregando } from '../components/Loader.jsx'

const TAM_MAX = 5 * 1024 * 1024 // 5 MB
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export default function Cadastro() {
  const { entrar } = useAuth()
  const navegar = useNavigate()

  const [form, setForm] = useState({ nome: '', email: '', senha: '', confirmar: '' })
  const [foto, setFoto] = useState(null)
  const [previa, setPrevia] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const alterar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  function escolherFoto(e) {
    const arq = e.target.files?.[0]
    if (!arq) { setFoto(null); setPrevia(null); return }
    if (!TIPOS.includes(arq.type)) {
      alertaErro('Imagem inválida', 'Envie uma imagem JPEG, PNG, WEBP ou GIF.')
      e.target.value = ''
      return
    }
    if (arq.size > TAM_MAX) {
      alertaErro('Imagem muito grande', 'O limite é de 5 MB.')
      e.target.value = ''
      return
    }
    setFoto(arq)
    setPrevia(URL.createObjectURL(arq))
  }

  function validar() {
    if (!form.nome.trim()) return 'Informe seu nome.'
    if (!form.email.trim()) return 'Informe seu e-mail.'
    if (form.senha.length < 6) return 'A senha deve ter no mínimo 6 caracteres.'
    if (form.senha !== form.confirmar) return 'As senhas não coincidem.'
    return null
  }

  async function aoEnviar(e) {
    e.preventDefault()
    const erro = validar()
    if (erro) { alertaErro('Verifique os dados', erro); return }

    setEnviando(true)
    try {
      // 1) Se escolheu foto, faz o upload PÚBLICO primeiro (não precisa de login).
      let id_foto_perfil = null
      if (foto) {
        const r = await arquivoService.enviar(foto)
        id_foto_perfil = r.id_arquivo
      }

      // 2) Cria a conta (cadastro público), já com a foto associada.
      await usuarioService.cadastrar({
        nome: form.nome.trim(),
        email: form.email.trim(),
        senha: form.senha,
        id_foto_perfil,
      })

      // 3) Entra automaticamente.
      await entrar(form.email.trim(), form.senha)

      await alertaSucesso('Conta criada!', 'Seu cadastro foi realizado com sucesso.')
      navegar('/perfil', { replace: true })
    } catch (err) {
      alertaErro('Não foi possível cadastrar', err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <div className="container pagina">
      {enviando && <OverlayCarregando texto="Criando sua conta..." />}
      <div className="auth-wrap">
        <div className="auth-card">
          <div className="auth-logo">
            <div className="icone">✨</div>
            <h1>Criar conta</h1>
            <p>Junte-se ao Livramente e organize suas leituras.</p>
          </div>

          <form className="form" onSubmit={aoEnviar}>
            <div className="campo center">
              {previa
                ? <img src={previa} alt="Prévia da foto" className="perfil-avatar" style={{ margin: '0 auto' }} />
                : <div className="perfil-avatar-vazio" style={{ margin: '0 auto' }}>{(form.nome || '?').charAt(0).toUpperCase()}</div>}
            </div>
            <div className="campo">
              <label htmlFor="foto">Foto de perfil (opcional)</label>
              <input id="foto" type="file" accept="image/*" onChange={escolherFoto} />
              <span className="ajuda">JPEG, PNG, WEBP ou GIF, até 5 MB.</span>
            </div>
            <div className="campo">
              <label htmlFor="nome">Nome</label>
              <input id="nome" type="text" value={form.nome} onChange={alterar('nome')} placeholder="Seu nome completo" />
            </div>
            <div className="campo">
              <label htmlFor="email">E-mail</label>
              <input id="email" type="email" value={form.email} onChange={alterar('email')} placeholder="voce@email.com" />
            </div>
            <div className="form-linha">
              <div className="campo">
                <label htmlFor="senha">Senha</label>
                <input id="senha" type="password" value={form.senha} onChange={alterar('senha')} placeholder="Mínimo 6 caracteres" />
              </div>
              <div className="campo">
                <label htmlFor="confirmar">Confirmar senha</label>
                <input id="confirmar" type="password" value={form.confirmar} onChange={alterar('confirmar')} placeholder="Repita a senha" />
              </div>
            </div>
            <button className="btn btn-primario btn-bloco" type="submit" disabled={enviando}>
              {enviando ? 'Cadastrando...' : 'Criar conta'}
            </button>
          </form>

          <p className="auth-troca">
            Já tem conta? <Link to="/login">Entrar</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
