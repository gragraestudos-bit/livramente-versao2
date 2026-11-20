const db = require("../../db");

async function validarEstante(req, res, next) {
    try {
        const idUsuario = req.usuario.id_usuario;
        const idLivro = Number(req.params.id_livro || req.body?.id_livro);

        const categoria = req.body?.categoria;

        if (!Number.isInteger(idLivro) || idLivro <= 0) {
            return res.status(400).json({msg: "Informe um ID do livro válido!"});
        }

        if (!["quero_ler", "lendo", "ja_li"].includes(categoria)) {
            return res.status(400).json({msg: "Informe uma categoria válida!"});
        }

        const validarUsuario = await db.query(
            "SELECT 1 FROM usuario WHERE id_usuario = $1 AND removido = FALSE",
            [idUsuario]
        );

        if (!validarUsuario.rowCount) {
            return res.status(404).json({msg: "Usuário não encontrado!"});
        }

        const validarLivro = await db.query(
            "SELECT 1 FROM livro WHERE id_livro = $1 AND removido = FALSE",
            [idLivro]
        );

        if (!validarLivro.rowCount) {
            return res.status(404).json({ msg: "Livro não encontrado!"});
        }

        req.dadosEstante = {idUsuario,idLivro,categoria};

        next();

    } catch (error) {
        console.error(error);

        return res.status(500).json({msg: "Erro interno ao validar a estante!"});
    }
}

module.exports = {validarEstante};
