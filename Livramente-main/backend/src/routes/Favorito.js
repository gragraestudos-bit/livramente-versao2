const express = require("express");
const router = express.Router();
const db = require("../db");

// MIDDLEWARES
const { validarUsuarioFavorito, validarLivroFavorito } = require("./middlewares/validarFavorito");
const { autenticar } = require("./middlewares/Autenticacao");

router.use(autenticar);

// GET ID LIVROS (quem favoritou o livro) — apenas favoritos ativos
router.get("/livro/:id_livro", validarLivroFavorito, async (req, res) => {
    try {
        const { idLivro } = req.dadosFavorito;

        const r = await db.query(
            `SELECT u.id_usuario, u.nome
             FROM favorito f
             INNER JOIN usuario u ON f.id_usuario = u.id_usuario
             WHERE f.id_livro = $1 AND f.removido = FALSE
             ORDER BY u.nome`,
            [idLivro]
        );

        return res.status(200).json({
            msg: "Usuários encontrados com sucesso!",
            quantidade: r.rowCount,
            usuarios: r.rows
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({ msg: "Erro interno ao consultar os usuários!" });
    }
});

// GET ID USUARIOS (favoritos do usuário) — apenas favoritos ativos de livros ativos
router.get("/usuario/:id_usuario", validarUsuarioFavorito, async (req, res, next) => {
    try {
        const { idUsuario } = req.dadosFavorito;

        if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
            return res.status(400).json({ msg: "Informe um ID de usuário válido!" });
        }

        const usuario = await db.query(
            "SELECT nome FROM usuario WHERE id_usuario = $1 AND removido = FALSE",
            [idUsuario]
        );

        if (!usuario.rowCount) {
            return res.status(404).json({ msg: "Usuário não encontrado!" });
        }

        const r = await db.query(
            `SELECT l.id_livro, l.titulo, l.autor, l.genero, l.capa,
                    f.data_favorito
             FROM favorito f
             INNER JOIN livro l ON f.id_livro = l.id_livro
             WHERE f.id_usuario = $1 AND f.removido = FALSE AND l.removido = FALSE
             ORDER BY l.titulo`,
            [idUsuario]
        );

        return res.status(200).json({
            msg: "Favoritos encontrados com sucesso!",
            usuario: usuario.rows[0].nome,
            favoritos: r.rows
        });

    } catch (error) {
        console.log(error);
        return res.status(500).json({ msg: "Erro interno ao procurar os favoritos desse usuário!", data: error.message })
    }
});

// POST (revive o favorito se ele tinha sido removido logicamente)
router.post("/", validarUsuarioFavorito, validarLivroFavorito, async (req, res) => {
    try {
        const { idUsuario, idLivro } = req.dadosFavorito;

        const r = await db.query(
            `INSERT INTO favorito (id_usuario, id_livro)
             VALUES ($1, $2)
             ON CONFLICT (id_usuario, id_livro) DO UPDATE
                SET removido = FALSE, data_favorito = CURRENT_TIMESTAMP
                WHERE favorito.removido = TRUE
             RETURNING *`,
            [idUsuario, idLivro]
        );

        if (!r.rowCount) {
            return res.status(409).json({ msg: "Este livro já está nos favoritos do usuário!" });
        }

        return res.status(201).json({
            msg: "Livro adicionado aos favoritos com sucesso!",
            data: r.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno ao adicionar livro aos favoritos!", data: error.message });
    }
});

// DELETE (EXCLUSÃO LÓGICA)
router.delete("/:id_usuario/:id_livro", validarUsuarioFavorito, validarLivroFavorito, async (req, res) => {
    try {
        const { idUsuario, idLivro } = req.dadosFavorito;

        const r = await db.query(
            `UPDATE favorito SET removido = TRUE
             WHERE id_usuario = $1 AND id_livro = $2 AND removido = FALSE
             RETURNING *`,
            [idUsuario, idLivro]
        );

        if (!r.rowCount) {
            return res.status(404).json({ msg: "Livro não encontrado nos favoritos do usuário!" });
        }

        return res.status(200).json({
            msg: "Livro removido dos favoritos com sucesso!",
            data: r.rows[0]
        });

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno ao remover o favorito!", data: error.message });
    }
});

module.exports = router;
