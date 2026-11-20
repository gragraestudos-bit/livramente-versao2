// Funções de acesso a cada grupo de rotas da API.
import { api } from './client.js'

// ---------- AUTENTICAÇÃO / USUÁRIOS (Grazi) ----------
export const authService = {
  login: (email, senha) => api.post('/autenticacao/login', { email, senha }, { auth: false }),
  me: () => api.get('/autenticacao/me'),
}

export const usuarioService = {
  cadastrar: (dados) => api.post('/usuario', dados, { auth: false }),
  buscar: (id) => api.get(`/usuario/${id}`, { auth: false }),
  listar: () => api.get('/usuario'), // apenas admin
  atualizar: (id, dados) => api.put(`/usuario/${id}`, dados),
  excluir: (id) => api.del(`/usuario/${id}`),
}

export const arquivoService = {
  // Upload público de imagem (JPEG/PNG/WEBP/GIF, até 5MB). Retorna { id_arquivo }.
  enviar: (file) => {
    const fd = new FormData()
    fd.append('arquivo', file)
    return api.upload('/arquivos', fd, { auth: false })
  },
  limparOrfaos: () => api.del('/arquivos/orfaos'),
}

// ---------- LIVROS / ESTANTE / FAVORITOS (Sophia) ----------
export const livroService = {
  listar: () => api.get('/livro', { auth: false }),
  buscar: (id) => api.get(`/livro/${id}`, { auth: false }),
  cadastrar: (dados) => api.post('/livro', dados),
  atualizar: (id, dados) => api.put(`/livro/${id}`, dados),
  excluir: (id) => api.del(`/livro/${id}`),
}

export const estanteService = {
  listar: (idUsuario) => api.get(`/estante/${idUsuario}`),
  adicionar: (id_livro, categoria) => api.post('/estante', { id_livro, categoria }),
  atualizar: (idUsuario, idLivro, categoria) =>
    api.put(`/estante/${idUsuario}/${idLivro}`, { categoria }),
  remover: (idUsuario, idLivro) => api.del(`/estante/${idUsuario}/${idLivro}`),
}

export const favoritoService = {
  doUsuario: (idUsuario) => api.get(`/favorito/usuario/${idUsuario}`),
  doLivro: (idLivro) => api.get(`/favorito/livro/${idLivro}`),
  adicionar: (id_livro) => api.post('/favorito', { id_livro }),
  remover: (idUsuario, idLivro) => api.del(`/favorito/${idUsuario}/${idLivro}`),
}

// ---------- EMPRÉSTIMOS / RESENHAS / COMENTÁRIOS / CURTIDAS (Ana) ----------
export const emprestimoService = {
  listar: () => api.get('/emprestimo'),
  buscar: (id) => api.get(`/emprestimo/${id}`),
  solicitar: (id_livro) => api.post('/emprestimo', { id_livro }),
  alterarStatus: (id, status, data_prevista_devolucao) =>
    api.put(`/emprestimo/${id}`, { status, data_prevista_devolucao }),
}

export const resenhaService = {
  listar: () => api.get('/resenha', { auth: false }),
  buscar: (id) => api.get(`/resenha/${id}`, { auth: false }),
  doLivro: (idLivro) => api.get(`/resenha/livro/${idLivro}`, { auth: false }),
  publicar: (id_livro, texto, nota) => api.post('/resenha', { id_livro, texto, nota }),
  editar: (id, texto, nota) => api.put(`/resenha/${id}`, { texto, nota }),
  excluir: (id) => api.del(`/resenha/${id}`),
}

export const comentarioService = {
  daResenha: (idResenha) => api.get(`/comentario/resenha/${idResenha}`, { auth: false }),
  publicar: (id_resenha, texto) => api.post('/comentario', { id_resenha, texto }),
  editar: (id, texto) => api.put(`/comentario/${id}`, { texto }),
  excluir: (id) => api.del(`/comentario/${id}`),
}

export const curtidaService = {
  daResenha: (idResenha) => api.get(`/curtida/resenha/${idResenha}`, { auth: false }),
  curtir: (idResenha) => api.post(`/curtida/${idResenha}`),
  descurtir: (idResenha) => api.del(`/curtida/${idResenha}`),
}
