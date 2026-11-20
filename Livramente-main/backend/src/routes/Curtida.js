const express = require("express");
const router = express.Router();
const db = require("../db");
const { autenticar } = require("./middlewares/Autenticacao");
const { validarIdResenhaComentario } = require("./middlewares/Validacoes");

// GET /curtida/resenha/:id_resenha  -> quantidade e quem curtiu (curtidas ativas)
router.get("/resenha/:id_resenha", validarIdResenhaComentario, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const r = await db.query(
            `SELECT u.id_usuario, u.nome, c.data_curtida
             FROM curtida c
             INNER JOIN usuario u ON c.id_usuario = u.id_usuario
             WHERE c.id_resenha = $1 AND c.removido = FALSE
             ORDER BY c.data_curtida`,
            [id_resenha]
        );
        return res.status(200).json({ quantidade: r.rowCount, usuarios: r.rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// POST /curtida/:id_resenha  -> curtir (revive a curtida se tinha sido removida)
router.post("/:id_resenha", autenticar, validarIdResenhaComentario, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const resenha = await db.query(
            "SELECT 1 FROM resenha WHERE id_resenha = $1 AND removido = FALSE",
            [id_resenha]
        );

        if (!resenha.rowCount) {
            return res.status(404).json({ msg: "Resenha não encontrada." });
        }

        const r = await db.query(
            `INSERT INTO curtida (id_usuario, id_resenha)
             VALUES ($1, $2)
             ON CONFLICT (id_usuario, id_resenha) DO UPDATE
                SET removido = FALSE, data_curtida = CURRENT_TIMESTAMP
                WHERE curtida.removido = TRUE
             RETURNING *`,
            [req.usuario.id_usuario, id_resenha]
        );

        if (!r.rowCount) return res.status(409).json({ msg: "Você já curtiu esta resenha." });
        return res.status(201).json({ msg: "Resenha curtida com sucesso.", curtida: r.rows[0] });
    } catch (error) {
        console.error(error);
        if (error.code === "23503") return res.status(404).json({ msg: "Resenha não encontrada." });
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// DELETE /curtida/:id_resenha  -> descurtir (EXCLUSÃO LÓGICA)
router.delete("/:id_resenha", autenticar, validarIdResenhaComentario, async (req, res) => {
    try {
        const id_resenha = req.idResenha;

        const r = await db.query(
            `UPDATE curtida SET removido = TRUE
             WHERE id_usuario = $1 AND id_resenha = $2 AND removido = FALSE
             RETURNING *`,
            [req.usuario.id_usuario, id_resenha]
        );

        if (!r.rowCount) return res.status(404).json({ msg: "Você não curtiu esta resenha." });
        return res.status(200).json({ msg: "Curtida removida com sucesso.", curtida: r.rows[0] });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

module.exports = router;
