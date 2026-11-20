const express = require("express");
const router = express.Router();
const db = require("../db");

// MIDDLEWARES
const {autenticar} = require("./middlewares/Autenticacao");
const {validarEstante} = require("./middlewares/validarEstante");
const {verificarDonoEstante} = require("./middlewares/verificarDonoEstante");

router.use(autenticar);

// Para não acabar digitando errado
router.get("/", (req, res, next) => {
    return res.status(400).json({ msg : "ID usuário não informado!"})
})
// GET POR ID (apenas itens não removidos, de livros ativos)
router.get("/:id_usuario", verificarDonoEstante,  async (req, res, next) => {
    try {
        const idUsuario = Number(req.params.id_usuario);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            return res.status(400).json({msg: "Informe um ID do usuário válido!"});
        }

        // Buscar o nome do usuário (não removido)
        const nomeUsuario = await db.query(
            "SELECT nome FROM usuario WHERE id_usuario = $1 AND removido = FALSE",
            [idUsuario]
        );

        if (!nomeUsuario.rowCount) {
            return res.status(404).json({msg: "Usuário não encontrado!"});
        }

        // Buscar os livros da estante
        const r = await db.query(
            `SELECT
                l.id_livro,
                l.titulo,
                l.autor,
                l.genero,
                l.capa,
                e.categoria,
                e.data_adicao
            FROM estante e
            INNER JOIN livro l
                ON e.id_livro = l.id_livro
            WHERE e.id_usuario = $1
              AND e.removido = FALSE
              AND l.removido = FALSE
            ORDER BY l.titulo`,
            [idUsuario]
        );

        // Organizar os livros por categoria
        const estantes = {quero_ler: [], lendo: [], ja_li: []};

        for (const livro of r.rows) {
            estantes[livro.categoria].push(livro);
        }

        return res.status(200).json({
            msg: "Estantes encontradas com sucesso!",
            usuario: nomeUsuario.rows[0].nome,
            estantes: estantes
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao consultar as estantes!", data: error.message});
    }
});

// POST (revive o item se ele tinha sido removido logicamente)
router.post("/", validarEstante, async (req, res, next) => {
    try {
        const { idUsuario, idLivro, categoria } = req.dadosEstante;

        const r = await db.query(
            `INSERT INTO estante (id_usuario, id_livro, categoria)
             VALUES ($1, $2, $3)
             ON CONFLICT (id_usuario, id_livro) DO UPDATE
                SET categoria = EXCLUDED.categoria,
                    removido = FALSE,
                    data_adicao = CURRENT_TIMESTAMP
                WHERE estante.removido = TRUE
             RETURNING *`,
            [idUsuario, idLivro, categoria]
        );

        if (!r.rowCount) {
            return res.status(409).json({msg: "Este livro já está na estante do usuário!"});
        }

        return res.status(201).json({
            msg: "Livro adicionado à estante com sucesso!",
            data: r.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao adicionar livro à estante!", data: error.message});
    }
});

// PUT
router.put("/:id_usuario/:id_livro", verificarDonoEstante, validarEstante, async (req, res, next) => {
    try {
        const { idUsuario, idLivro, categoria } = req.dadosEstante;

        const r = await db.query(
            `UPDATE estante
             SET categoria = $1
             WHERE id_usuario = $2 AND id_livro = $3 AND removido = FALSE
             RETURNING *`,
            [categoria, idUsuario, idLivro]
        );

        if (!r.rowCount) {
            return res.status(404).json({ msg: "Livro não encontrado na estante do usuário!"});
        }

        return res.status(200).json({
            msg: "Categoria atualizada com sucesso!",
            data: r.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao atualizar a estante!", data: error.message
        });
    }
});

// DELETE (EXCLUSÃO LÓGICA)
router.delete("/:id_usuario/:id_livro", verificarDonoEstante, async (req, res, next) => {
    try {
        const idUsuario = req.usuario.id_usuario;
        const idLivro = Number(req.params.id_livro);

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            return res.status(400).json({msg: "Informe um ID do usuário válido!"
            });
        }

        if (!Number.isInteger(idLivro) || idLivro <= 0) {
            return res.status(400).json({msg: "Informe um ID do livro válido!"});
        }

        const r = await db.query(
            `UPDATE estante SET removido = TRUE
             WHERE id_usuario = $1 AND id_livro = $2 AND removido = FALSE
             RETURNING *`,
            [idUsuario, idLivro]
        );

        if (!r.rowCount) {
            return res.status(404).json({msg: "Livro não encontrado na estante do usuário!"});
        }

        return res.status(200).json({
            msg: "Livro removido da estante com sucesso!",
            data: r.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao remover livro da estante!", data: error.message});
    }
});

module.exports = router;
