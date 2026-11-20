const express = require("express");
const router = express.Router();
const db = require("../db");
const { autenticar, apenasAdmin } = require("./middlewares/Autenticacao");
const { validarDadosLivro, validarIdLivro } = require("./middlewares/Validacoes");

/* MÉTODOS */
// GET - por id
router.get("/:id", validarIdLivro, async (req, res) => {
    try {
        const id_livro = req.idLivro;

        const resultado = await db.query(
            `SELECT id_livro, titulo, autor, genero, sinopse, capa, isbn,
                    editora, ano_publicacao, numero_paginas,
                    quantidade_exemplares, exemplares_disponiveis, data_cadastro
             FROM livro
             WHERE id_livro = $1 AND removido = FALSE`,
            [id_livro]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ msg: "Livro não encontrado." });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// GET - lista todos os livros não removidos
router.get("/", async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id_livro, titulo, autor, genero, sinopse, capa, isbn,
                    editora, ano_publicacao, numero_paginas,
                    quantidade_exemplares, exemplares_disponiveis, data_cadastro
             FROM livro
             WHERE removido = FALSE
             ORDER BY titulo`
        );

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// POST
router.post("/", autenticar, apenasAdmin, validarDadosLivro, async (req, res) => {
    try {
        const dados = req.dadosLivro;

        const resultado = await db.query(
            `INSERT INTO livro
                (titulo, autor, genero, sinopse, capa, isbn, editora,
                 ano_publicacao, numero_paginas, quantidade_exemplares,
                 exemplares_disponiveis)
             VALUES
                ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $10)
             RETURNING *`,
            [
                dados.titulo,
                dados.autor,
                dados.genero,
                dados.sinopse,
                dados.capa,
                dados.isbn,
                dados.editora,
                dados.ano_publicacao,
                dados.numero_paginas,
                dados.quantidade_exemplares
            ]
        );

        return res.status(201).json({
            msg: "Livro cadastrado com sucesso.",
            livro: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({
                msg: "Este ISBN já está cadastrado."
            });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// PUT
router.put("/:id", autenticar, apenasAdmin, validarIdLivro, validarDadosLivro, async (req, res) => {
    try {
        const id_livro = req.idLivro;

        const dados = req.dadosLivro;

        const resultado = await db.query(
            `UPDATE livro
             SET titulo = $1,
                 autor = $2,
                 genero = $3,
                 sinopse = $4,
                 capa = $5,
                 isbn = $6,
                 editora = $7,
                 ano_publicacao = $8,
                 numero_paginas = $9,
                 exemplares_disponiveis =
                    exemplares_disponiveis + ($10 - quantidade_exemplares),
                 quantidade_exemplares = $10
             WHERE id_livro = $11
               AND removido = FALSE
               AND exemplares_disponiveis + ($10 - quantidade_exemplares) >= 0
             RETURNING *`,
            [
                dados.titulo,
                dados.autor,
                dados.genero,
                dados.sinopse,
                dados.capa,
                dados.isbn,
                dados.editora,
                dados.ano_publicacao,
                dados.numero_paginas,
                dados.quantidade_exemplares,
                id_livro
            ]
        );

        if (resultado.rowCount === 0) {
            const existe = await db.query(
                "SELECT id_livro FROM livro WHERE id_livro = $1 AND removido = FALSE",
                [id_livro]
            );

            if (existe.rowCount === 0) {
                return res.status(404).json({
                    msg: "Livro não encontrado."
                });
            }

            return res.status(409).json({
                msg: "A quantidade informada é menor que o número de exemplares emprestados."
            });
        }

        return res.status(200).json({
            msg: "Livro atualizado com sucesso.",
            livro: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({
                msg: "Este ISBN já está cadastrado."
            });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// DELETE (EXCLUSÃO LÓGICA: marca removido = TRUE)
router.delete("/:id", autenticar, apenasAdmin, validarIdLivro, async (req, res) => {
    try {
        const id_livro = req.idLivro;

        const resultado = await db.query(
            `UPDATE livro
             SET removido = TRUE
             WHERE id_livro = $1 AND removido = FALSE
             RETURNING id_livro, titulo`,
            [id_livro]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                msg: "Livro não encontrado."
            });
        }

        return res.status(200).json({
            msg: "Livro excluído com sucesso.",
            livro: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

module.exports = router;
