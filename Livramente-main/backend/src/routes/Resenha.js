const express = require("express");
const router = express.Router();
const db = require("../db");
const { autenticar } = require("./middlewares/Autenticacao");
const {
    validarIdResenha,
    validarDadosResenha,
    validarEdicaoResenha
} = require("./middlewares/Validacoes");

/* METODOS */
// GET - lista todas as resenhas não removidas (de livros ativos)
router.get("/", async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT r.id_resenha, r.texto, r.nota, r.data_publicacao,
                    u.id_usuario, u.nome,
                    l.id_livro, l.titulo
             FROM resenha r
             INNER JOIN usuario u ON r.id_usuario = u.id_usuario
             INNER JOIN livro l ON r.id_livro = l.id_livro
             WHERE r.removido = FALSE AND l.removido = FALSE
             ORDER BY r.data_publicacao DESC`
        );

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({
            msg: "Erro interno do servidor."
        });
    }
});


// GET - por id
router.get("/:id", validarIdResenha, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const resultado = await db.query(
            `SELECT r.id_resenha, r.texto, r.nota, r.data_publicacao,
                    u.id_usuario, u.nome,
                    l.id_livro, l.titulo
             FROM resenha r
             INNER JOIN usuario u ON r.id_usuario = u.id_usuario
             INNER JOIN livro l ON r.id_livro = l.id_livro
             WHERE r.id_resenha = $1 AND r.removido = FALSE`,
            [id_resenha]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({
                msg: "Resenha não encontrada."
            });
        }

        return res.status(200).json(resultado.rows[0]);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// GET - resenhas de um livro específico (não removidas)
router.get("/livro/:id", validarIdResenha, async (req, res) => {
    try {
        const id_livro = req.idResenha; // reaproveita o tratamento de ID numérico

        const resultado = await db.query(
            `SELECT r.id_resenha, r.texto, r.nota, r.data_publicacao,
                    u.id_usuario, u.nome
             FROM resenha r
             INNER JOIN usuario u ON r.id_usuario = u.id_usuario
             WHERE r.id_livro = $1 AND r.removido = FALSE
             ORDER BY r.data_publicacao DESC`,
            [id_livro]
        );

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// POST
router.post("/", autenticar, validarDadosResenha, async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;
        const id_livro = req.dadosResenha.id_livro;
        const texto = req.dadosResenha.texto;
        const nota = req.dadosResenha.nota;

        const livro = await db.query(
            "SELECT 1 FROM livro WHERE id_livro = $1 AND removido = FALSE",
            [id_livro]
        );

        if (!livro.rowCount) {
            return res.status(404).json({ msg: "Livro não encontrado." });
        }

        const resultado = await db.query(
            `INSERT INTO resenha (id_usuario, id_livro, texto, nota)
             VALUES ($1, $2, $3, $4)
             RETURNING *`,
            [id_usuario, id_livro, texto, nota]
        );

        return res.status(201).json({
            msg: "Resenha cadastrada com sucesso.",
            resenha: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({ msg: "Você já publicou uma resenha para este livro." });
        }

        if (error.code === "23503") {
            return res.status(404).json({ msg: "Livro não encontrado." });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// PUT - EDITAR RESENHA
router.put("/:id", autenticar, validarIdResenha, validarEdicaoResenha, async (req, res) => {
    try {

        const id_resenha = req.idResenha;
        const texto = req.dadosResenha.texto;
        const nota = req.dadosResenha.nota;

        const resultado = await db.query(
            `UPDATE resenha
             SET texto = $1,
                 nota = $2
             WHERE id_resenha = $3
               AND id_usuario = $4
               AND removido = FALSE
             RETURNING *`,
            [
                texto,
                nota,
                id_resenha,
                req.usuario.id_usuario
            ]
        );

        if (resultado.rowCount === 0) {
            const existe = await db.query(
                "SELECT id_resenha FROM resenha WHERE id_resenha = $1 AND removido = FALSE",
                [id_resenha]
            );

            if (existe.rowCount === 0) {
                return res.status(404).json({ msg: "Resenha não encontrada." });
            }

            return res.status(403).json({ msg: "Você não tem permissão para editar esta resenha." });
        }

        return res.status(200).json({
            msg: "Resenha atualizada com sucesso.",
            resenha: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// DELETE - EXCLUIR RESENHA (EXCLUSÃO LÓGICA)
router.delete("/:id", autenticar, validarIdResenha, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const resultado = await db.query(
            `UPDATE resenha
             SET removido = TRUE
             WHERE id_resenha = $1
               AND removido = FALSE
               AND (id_usuario = $2 OR $3 = TRUE)
             RETURNING id_resenha, texto`,
            [
                id_resenha,
                req.usuario.id_usuario,
                req.usuario.administrador
            ]
        );

        if (resultado.rowCount === 0) {
            const existe = await db.query(
                "SELECT id_resenha FROM resenha WHERE id_resenha = $1 AND removido = FALSE",
                [id_resenha]
            );

            if (existe.rowCount === 0) {
                return res.status(404).json({ msg: "Resenha não encontrada." });
            }

            return res.status(403).json({ msg: "Você não tem permissão para excluir esta resenha." });
        }

        return res.status(200).json({
            msg: "Resenha excluída com sucesso.",
            resenha: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

module.exports = router;
