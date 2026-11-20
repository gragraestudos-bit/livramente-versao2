import { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { authService, usuarioService } from '../api/services.js'
import {
  salvarSessao, lerToken, lerUsuario, limparSessao, registrarExpiracao,
} from '../api/client.js'
import { toast } from '../utils/alertas.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [usuario, setUsuario] = useState(() => lerUsuario())
  const [carregando, setCarregando] = useState(true)

  const sair = useCallback((mensagem) => {
    limparSessao()
    setUsuario(null)
    if (mensagem) toast(mensagem, 'info')
  }, [])

  // Desloga automaticamente quando a API responde 401 (token expirado).
  useEffect(() => {
    registrarExpiracao((msg) => sair(msg || 'Sua sessão expirou. Faça login novamente.'))
  }, [sair])

  // Ao abrir o app, se houver token, confirma que ele ainda é válido.
  useEffect(() => {
    let ativo = true
    async function validar() {
      if (!lerToken()) { setCarregando(false); return }
      try {
        const r = await authService.me()
        if (ativo && r?.usuario) {
          setUsuario((anterior) => {
            const atualizado = { ...anterior, ...r.usuario }
            salvarSessao(null, atualizado)
            return atualizado
          })
        }
      } catch {
        // 401 já trata o logout via registrarExpiracao.
      } finally {
        if (ativo) setCarregando(false)
      }
    }
    validar()
    return () => { ativo = false }
  }, [])

  const entrar = useCallback(async (email, senha) => {
    const r = await authService.login(email, senha)
    salvarSessao(r.token, r.usuario)
    setUsuario(r.usuario)
    return r.usuario
  }, [])

  // Atualiza os dados do usuário logado em memória e no armazenamento.
  const atualizarUsuarioLocal = useCallback((dados) => {
    setUsuario((anterior) => {
      const atualizado = { ...anterior, ...dados }
      salvarSessao(null, atualizado)
      return atualizado
    })
  }, [])

  // Recarrega o perfil completo do backend (ex.: após editar).
  const recarregarUsuario = useCallback(async () => {
    if (!usuario?.id_usuario) return
    const dados = await usuarioService.buscar(usuario.id_usuario)
    atualizarUsuarioLocal(dados)
    return dados
  }, [usuario, atualizarUsuarioLocal])

  const valor = {
    usuario,
    autenticado: !!usuario,
    ehAdmin: !!usuario?.administrador,
    carregando,
    entrar,
    sair,
    atualizarUsuarioLocal,
    recarregarUsuario,
  }

  return <AuthContext.Provider value={valor}>{children}</AuthContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider')
  return ctx
}
