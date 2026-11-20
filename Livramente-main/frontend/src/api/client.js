// Cliente central de acesso à API do Livramente.
// A URL base vem da variável de ambiente VITE_API_URL (ver .env.example);
// em desenvolvimento local o backend roda em http://localhost:3000.

export const API_URL = (import.meta.env.VITE_API_URL || 'http://localhost:3000').replace(/\/$/, '')

const TOKEN_KEY = 'livramente_token'
const USER_KEY = 'livramente_usuario'

// ---- Armazenamento do token JWT e do usuário ----
export function salvarSessao(token, usuario) {
  if (token) localStorage.setItem(TOKEN_KEY, token)
  if (usuario) localStorage.setItem(USER_KEY, JSON.stringify(usuario))
}

export function lerToken() {
  return localStorage.getItem(TOKEN_KEY)
}

export function lerUsuario() {
  try {
    const raw = localStorage.getItem(USER_KEY)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export function limparSessao() {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
}

// Callback chamado quando a API responde 401 (token ausente/expirado),
// para o AuthContext deslogar o usuário automaticamente.
let aoExpirar = null
export function registrarExpiracao(fn) { aoExpirar = fn }

// Erro padronizado da API: carrega status HTTP e mensagem amigável.
export class ErroApi extends Error {
  constructor(mensagem, status) {
    super(mensagem)
    this.name = 'ErroApi'
    this.status = status
  }
}

// Função base de requisição. Anexa o token automaticamente e trata JSON.
async function requisitar(caminho, { method = 'GET', body, auth = true, isForm = false } = {}) {
  const headers = {}
  const token = lerToken()

  if (auth && token) headers['Authorization'] = `Bearer ${token}`

  let corpo
  if (isForm) {
    corpo = body // FormData: o navegador define o Content-Type com boundary
  } else if (body !== undefined) {
    headers['Content-Type'] = 'application/json'
    corpo = JSON.stringify(body)
  }

  let resposta
  try {
    resposta = await fetch(`${API_URL}${caminho}`, { method, headers, body: corpo })
  } catch {
    throw new ErroApi('Não foi possível conectar ao servidor. Verifique se o backend está em execução.', 0)
  }

  // 204 sem conteúdo
  if (resposta.status === 204) return null

  let dados = null
  const tipo = resposta.headers.get('content-type') || ''
  if (tipo.includes('application/json')) {
    dados = await resposta.json().catch(() => null)
  }

  if (!resposta.ok) {
    const mensagem = (dados && dados.msg) || 'Ocorreu um erro inesperado.'
    if (resposta.status === 401 && token && typeof aoExpirar === 'function') {
      // Token inválido/expirado: encerra a sessão.
      aoExpirar(mensagem)
    }
    throw new ErroApi(mensagem, resposta.status)
  }

  return dados
}

export const api = {
  get: (caminho, opcoes) => requisitar(caminho, { ...opcoes, method: 'GET' }),
  post: (caminho, body, opcoes) => requisitar(caminho, { ...opcoes, method: 'POST', body }),
  put: (caminho, body, opcoes) => requisitar(caminho, { ...opcoes, method: 'PUT', body }),
  del: (caminho, opcoes) => requisitar(caminho, { ...opcoes, method: 'DELETE' }),
  // Upload multipart (imagens). O endpoint /arquivos é público.
  upload: (caminho, formData, opcoes) =>
    requisitar(caminho, { ...opcoes, method: 'POST', body: formData, isForm: true }),
}

// ---- Helpers de URL de imagens ----
// Capa do livro: pode ser uma URL externa (http...) ou um caminho interno (/arquivos/ID).
export function urlCapa(capa) {
  if (!capa) return null
  if (/^https?:\/\//i.test(capa)) return capa
  if (capa.startsWith('/')) return `${API_URL}${capa}`
  return `${API_URL}/${capa}`
}

// Foto de perfil do usuário: prioriza o arquivo enviado (id_foto_perfil).
export function urlAvatar(usuario) {
  if (!usuario) return null
  if (usuario.id_foto_perfil) return `${API_URL}/arquivos/${usuario.id_foto_perfil}`
  if (usuario.foto_perfil) return urlCapa(usuario.foto_perfil)
  return null
}
