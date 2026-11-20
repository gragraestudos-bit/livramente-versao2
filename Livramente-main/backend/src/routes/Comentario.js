const express = require("express");
const router = express.Router();
const db = require("../db");
const { autenticar } = require("./middlewares/Autenticacao");
const {
    validarIdComentario,
    validarIdResenhaComentario,
    validarDadosComentario
} = require("./middlewares/Validacoes");

// GET /comentario/resenha/:id_resenha  (apenas comentários não removidos)
router.get("/resenha/:id_resenha", validarIdResenhaComentario, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const r = await db.query(
            `SELECT c.id_comentario, c.texto, c.data_comentario,
                    u.id_usuario, u.nome
             FROM comentario c
             INNER JOIN usuario u ON c.id_usuario = u.id_usuario
             WHERE c.id_resenha = $1 AND c.removido = FALSE
             ORDER BY c.data_comentario`,
            [id_resenha]
        );
        return res.status(200).json(r.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// POST /comentario  (a resenha precisa existir e não estar removida)
router.post("/", autenticar, validarIdResenhaComentario, validarDadosComentario, async (req, res) => {
    try {
        const id_resenha = req.idResenha;
        const texto = req.dadosComentario.texto;

        const resenha = await db.query(
            "SELECT 1 FROM resenha WHERE id_resenha = $1 AND removido = FALSE",
            [id_resenha]
        );

        if (!resenha.rowCount) {
            return res.status(404).json({ msg: "Resenha não encontrada." });
        }

        const r = await db.query(
            `INSERT INTO comentario (id_usuario, id_resenha, texto)
             VALUES ($1, $2, $3)
             RETURNING *`,
            [req.usuario.id_usuario, id_resenha, texto]
        );
        return res.status(201).json({ msg: "Comentário cadastrado com sucesso.", comentario: r.rows[0] });
    } catch (error) {
        console.error(error);
        if (error.code === "23503") return res.status(404).json({ msg: "Resenha não encontrada." });
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// PUT /comentario/:id (só o dono)
router.put("/:id", autenticar, validarIdComentario, validarDadosComentario, async (req, res) => {
    try {
        const id = req.idComentario;
        const texto = req.dadosComentario.texto;

        const r = await db.query(
            `UPDATE comentario SET texto = $1
             WHERE id_comentario = $2 AND id_usuario = $3 AND removido = FALSE
             RETURNING *`,
            [texto, id, req.usuario.id_usuario]
        );

        if (!r.rowCount) {
            const existe = await db.query("SELECT 1 FROM comentario WHERE id_comentario = $1 AND removido = FALSE", [id]);
            if (!existe.rowCount) return res.status(404).json({ msg: "Comentário não encontrado." });
            return res.status(403).json({ msg: "Você não tem permissão para editar este comentário." });
        }
        return res.status(200).json({ msg: "Comentário atualizado com sucesso.", comentario: r.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// DELETE /comentario/:id (dono ou admin) — EXCLUSÃO LÓGICA
router.delete("/:id", autenticar, validarIdComentario, async (req, res) => {
    try {
        const id = req.idComentario;

        const r = await db.query(
            `UPDATE comentario SET removido = TRUE
             WHERE id_comentario = $1 AND removido = FALSE AND (id_usuario = $2 OR $3 = TRUE)
             RETURNING id_comentario`,
            [id, req.usuario.id_usuario, req.usuario.administrador]
        );

        if (!r.rowCount) {
            const existe = await db.query("SELECT 1 FROM comentario WHERE id_comentario = $1 AND removido = FALSE", [id]);
            if (!existe.rowCount) return res.status(404).json({ msg: "Comentário não encontrado." });
            return res.status(403).json({ msg: "Você não tem permissão para excluir este comentário." });
        }
        return res.status(200).json({ msg: "Comentário excluído com sucesso.", comentario: r.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

module.exports = router;
