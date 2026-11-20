const {
    tratarId,
    tratarData,
    tratarTexto,
    tratarTextoOpcional,
    tratarNumeroOpcional,
    tratarQuantidade,
    tratarNota,
    tratarISBN
} = require("./Tratamentos");

// ------------------ LIVROS -------------------------
function validarDadosLivro(req, res, next) {
    try {
        const dados = req.body || {};

        const titulo = tratarTexto(dados.titulo);
        const autor = tratarTexto(dados.autor);
        const genero = tratarTexto(dados.genero);
        const sinopse = tratarTextoOpcional(dados.sinopse);
        const capa = tratarTextoOpcional(dados.capa);
        const isbn = tratarISBN(dados.isbn);
        const editora = tratarTextoOpcional(dados.editora);
        const ano_publicacao = tratarNumeroOpcional(dados.ano_publicacao);
        const numero_paginas = tratarNumeroOpcional(dados.numero_paginas);
        const quantidade_exemplares = tratarQuantidade(dados.quantidade_exemplares);

        if (!titulo || !autor || !genero ||
            sinopse === undefined || capa === undefined ||
            isbn === undefined || editora === undefined ||
            ano_publicacao === undefined || numero_paginas === undefined ||
            quantidade_exemplares === null) {
            return res.status(400).json({ msg: "Informe os dados do livro corretamente!" });
        }

        req.dadosLivro = {
            titulo,
            autor,
            genero,
            sinopse,
            capa,
            isbn,
            editora,
            ano_publicacao,
            numero_paginas,
            quantidade_exemplares
        };

        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro ao validar os dados do livro!" });
    }
}

function validarIdLivro(req, res, next) {
    const id_livro = tratarId(req.params.id);

    if (!id_livro) {
        return res.status(400).json({ msg: "ID inválido." });
    }

    req.idLivro = id_livro;

    next();
}

//------------------------------ EMPRÉSTIMOS ------------------------

function validarIdEmprestimo(req, res, next) {
    const id_emprestimo = tratarId(req.params.id);

    if (!id_emprestimo) {
        return res.status(400).json({ msg: "ID do empréstimo inválido." });
    }

    req.idEmprestimo = id_emprestimo;

    next();
}

function validarIdLivroEmprestimo(req, res, next) {
    const id_livro = tratarId((req.body || {}).id_livro);

    if (!id_livro) {
        return res.status(400).json({ msg: "ID do livro inválido." });
    }

    req.idLivro = id_livro;

    next();
}

function validarDadosEmprestimo(req, res, next) {
    const dados = req.body || {};
    const status = dados.status;

    const status_permitidos = [
        "aprovado",
        "recusado",
        "cancelado",
        "devolvido"
    ];

    if (!status_permitidos.includes(status)) {
        return res.status(400).json({ msg: "Status inválido." });
    }

    let data_prevista_devolucao = null;

    if (status === "aprovado") {
        data_prevista_devolucao = tratarData(dados.data_prevista_devolucao);

        if (!data_prevista_devolucao) {
            return res.status(400).json({
                msg: "Informe uma data prevista de devolução válida (AAAA-MM-DD)."
            });
        }
    }

    req.dadosEmprestimo = {
        status,
        data_prevista_devolucao
    };

    next();
}

//------------------------------ RESENHAS ------------------------

function validarIdResenha(req, res, next) {
    const id_resenha = tratarId(req.params.id);

    if (!id_resenha) {
        return res.status(400).json({ msg: "ID da resenha inválido." });
    }

    req.idResenha = id_resenha;

    next();
}

function validarDadosResenha(req, res, next) {
    const dados = req.body || {};

    const id_livro = tratarId(dados.id_livro);
    const texto = tratarTexto(dados.texto);
    const nota = tratarNota(dados.nota);

    if (!id_livro) {
        return res.status(400).json({ msg: "ID do livro inválido." });
    }

    if (!texto) {
        return res.status(400).json({ msg: "O texto da resenha é obrigatório." });
    }

    if (!nota) {
        return res.status(400).json({ msg: "A nota deve ser um número inteiro entre 1 e 5." });
    }

    req.dadosResenha = {
        id_livro,
        texto,
        nota
    };

    next();
}

function validarEdicaoResenha(req, res, next) {
    const dados = req.body || {};

    const texto = tratarTexto(dados.texto);
    const nota = tratarNota(dados.nota);

    if (!texto) {
        return res.status(400).json({ msg: "O texto da resenha é obrigatório." });
    }

    if (!nota) {
        return res.status(400).json({ msg: "A nota deve ser um número inteiro entre 1 e 5." });
    }

    req.dadosResenha = {
        texto,
        nota
    };

    next();
}

//------------------------------ COMENTÁRIOS ------------------------

function validarIdComentario(req, res, next) {
    const id_comentario = tratarId(req.params.id);

    if (!id_comentario) {
        return res.status(400).json({ msg: "ID do comentário inválido." });
    }

    req.idComentario = id_comentario;

    next();
}

function validarIdResenhaComentario(req, res, next) {
    const id_resenha = tratarId(
        req.params.id_resenha || (req.body || {}).id_resenha
    );

    if (!id_resenha) {
        return res.status(400).json({ msg: "ID da resenha inválido." });
    }

    req.idResenha = id_resenha;

    next();
}

function validarDadosComentario(req, res, next) {
    const texto = tratarTexto((req.body || {}).texto);

    if (!texto) {
        return res.status(400).json({
            msg: "O texto do comentário é obrigatório."
        });
    }

    req.dadosComentario = {
        texto
    };

    next();
}

module.exports = { 
    validarDadosLivro, 
    validarIdLivro, 
    validarIdEmprestimo, 
    validarIdLivroEmprestimo,
    validarDadosEmprestimo,
    validarIdResenha,
    validarDadosResenha,
    validarEdicaoResenha,
    validarIdComentario,
    validarIdResenhaComentario,
    validarDadosComentario
};