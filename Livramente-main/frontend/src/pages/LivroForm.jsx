import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { livroService, arquivoService } from '../api/services.js'
import { alertaErro, alertaSucesso, toast } from '../utils/alertas.js'
import { Carregando, OverlayCarregando } from '../components/Loader.jsx'
import { urlCapa } from '../api/client.js'

const TAM_MAX = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']
const VAZIO = {
  titulo: '', autor: '', genero: '', sinopse: '', editora: '',
  isbn: '', ano_publicacao: '', numero_paginas: '', quantidade_exemplares: '1', capa: '',
}

export default function LivroForm() {
  const { id } = useParams()
  const navegar = useNavigate()
  const editando = Boolean(id)

  const [form, setForm] = useState(VAZIO)
  const [carregando, setCarregando] = useState(editando)
  const [salvando, setSalvando] = useState(false)
  const [capaArquivo, setCapaArquivo] = useState(null)
  const [previa, setPrevia] = useState(null)

  useEffect(() => {
    if (!editando) return
    let ativo = true
    livroService.buscar(id)
      .then((l) => {
        if (!ativo) return
        setForm({
          titulo: l.titulo || '', autor: l.autor || '', genero: l.genero || '',
          sinopse: l.sinopse || '', editora: l.editora || '', isbn: l.isbn || '',
          ano_publicacao: l.ano_publicacao || '', numero_paginas: l.numero_paginas || '',
          quantidade_exemplares: String(l.quantidade_exemplares ?? '1'), capa: l.capa || '',
        })
        setPrevia(urlCapa(l.capa))
      })
      .catch((err) => alertaErro('Erro ao carregar o livro', err.message))
      .finally(() => { if (ativo) setCarregando(false) })
    return () => { ativo = false }
  }, [id, editando])

  const alterar = (campo) => (e) => setForm((f) => ({ ...f, [campo]: e.target.value }))

  function escolherCapa(e) {
    const arq = e.target.files?.[0]
    if (!arq) return
    if (!TIPOS.includes(arq.type)) { alertaErro('Imagem inválida', 'Use JPEG, PNG, WEBP ou GIF.'); e.target.value = ''; return }
    if (arq.size > TAM_MAX) { alertaErro('Imagem muito grande', 'O limite é de 5 MB.'); e.target.value = ''; return }
    setCapaArquivo(arq)
    setPrevia(URL.createObjectURL(arq))
  }

  async function aoEnviar(e) {
    e.preventDefault()
    if (!form.titulo.trim() || !form.autor.trim() || !form.genero.trim()) {
      alertaErro('Campos obrigatórios', 'Preencha título, autor e gênero.'); return
    }
    const qtd = Number(form.quantidade_exemplares)
    if (!Number.isInteger(qtd) || qtd <= 0) { alertaErro('Quantidade inválida', 'Informe um número de exemplares maior que zero.'); return }
    if (form.isbn && !/^[0-9]{13}$/.test(form.isbn.trim())) { alertaErro('ISBN inválido', 'O ISBN deve ter exatamente 13 dígitos.'); return }

    setSalvando(true)
    try {
      let capa = form.capa
      if (capaArquivo) {
        const r = await arquivoService.enviar(capaArquivo)
        capa = `/arquivos/${r.id_arquivo}`
      }

      const dados = {
        titulo: form.titulo.trim(),
        autor: form.autor.trim(),
        genero: form.genero.trim(),
        sinopse: form.sinopse.trim() || null,
        editora: form.editora.trim() || null,
        isbn: form.isbn.trim() || null,
        ano_publicacao: form.ano_publicacao === '' ? null : Number(form.ano_publicacao),
        numero_paginas: form.numero_paginas === '' ? null : Number(form.numero_paginas),
        quantidade_exemplares: qtd,
        capa: capa || null,
      }

      if (editando) {
        await livroService.atualizar(id, dados)
        toast('Livro atualizado ✏️')
      } else {
        await livroService.cadastrar(dados)
        toast('Livro cadastrado 📗')
      }
      await alertaSucesso('Pronto!', editando ? 'Livro atualizado com sucesso.' : 'Livro cadastrado com sucesso.')
      navegar('/admin')
    } catch (err) {
      alertaErro('Não foi possível salvar', err.message)
    } finally {
      setSalvando(false)
    }
  }

  if (carregando) return <div className="container pagina"><Carregando /></div>

  return (
    <div className="container pagina">
      {salvando && <OverlayCarregando texto="Salvando livro..." />}
      <h2 className="pagina-titulo">{editando ? 'Editar livro' : 'Cadastrar livro'}</h2>
      <p className="pagina-sub">Preencha as informações do livro do acervo.</p>

      <div className="card">
        <form className="form" onSubmit={aoEnviar}>
          <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
            <div style={{ width: 160, flexShrink: 0 }}>
              {previa
                ? <img src={previa} alt="Prévia da capa" className="livro-capa" style={{ borderRadius: 10 }} />
                : <div className="livro-capa-vazia" style={{ borderRadius: 10 }}>📖</div>}
            </div>
            <div className="campo" style={{ flex: 1, minWidth: 220 }}>
              <label htmlFor="capa">Capa (imagem)</label>
              <input id="capa" type="file" accept="image/*" onChange={escolherCapa} />
              <span className="ajuda">JPEG, PNG, WEBP ou GIF, até 5 MB. A imagem é enviada e associada ao livro.</span>
            </div>
          </div>

          <div className="campo">
            <label htmlFor="titulo">Título *</label>
            <input id="titulo" value={form.titulo} onChange={alterar('titulo')} />
          </div>
          <div className="form-linha">
            <div className="campo">
              <label htmlFor="autor">Autor *</label>
              <input id="autor" value={form.autor} onChange={alterar('autor')} />
            </div>
            <div className="campo">
              <label htmlFor="genero">Gênero *</label>
              <input id="genero" value={form.genero} onChange={alterar('genero')} />
            </div>
          </div>
          <div className="campo">
            <label htmlFor="sinopse">Sinopse</label>
            <textarea id="sinopse" value={form.sinopse} onChange={alterar('sinopse')} />
          </div>
          <div className="form-linha">
            <div className="campo">
              <label htmlFor="editora">Editora</label>
              <input id="editora" value={form.editora} onChange={alterar('editora')} />
            </div>
            <div className="campo">
              <label htmlFor="isbn">ISBN (13 dígitos)</label>
              <input id="isbn" value={form.isbn} onChange={alterar('isbn')} placeholder="Opcional" />
            </div>
          </div>
          <div className="form-linha">
            <div className="campo">
              <label htmlFor="ano">Ano de publicação</label>
              <input id="ano" type="number" value={form.ano_publicacao} onChange={alterar('ano_publicacao')} />
            </div>
            <div className="campo">
              <label htmlFor="paginas">Número de páginas</label>
              <input id="paginas" type="number" value={form.numero_paginas} onChange={alterar('numero_paginas')} />
            </div>
          </div>
          <div className="campo" style={{ maxWidth: 220 }}>
            <label htmlFor="qtd">Quantidade de exemplares *</label>
            <input id="qtd" type="number" min="1" value={form.quantidade_exemplares} onChange={alterar('quantidade_exemplares')} />
          </div>

          <div className="linha-acoes">
            <button className="btn btn-primario" type="submit" disabled={salvando}>
              {editando ? 'Salvar alterações' : 'Cadastrar livro'}
            </button>
            <button className="btn btn-outline" type="button" onClick={() => navegar(-1)}>Cancelar</button>
          </div>
        </form>
      </div>
    </div>
  )
}
