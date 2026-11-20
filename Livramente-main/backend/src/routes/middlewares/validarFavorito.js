const db = require("../../db");

async function validarUsuarioFavorito(req, res, next) {
    try {
        const dados = req.body || {};
        const idInformado = req.params.id_usuario ?? dados.id_usuario;
        const idUsuario = req.usuario.id_usuario;

        if (idInformado !== undefined) {
            const id = Number(idInformado);

            if (!Number.isInteger(id) || id <= 0) {
                return res.status(400).json({msg: "Informe um ID de usuário válido!"});
            }

            if (id !== idUsuario) {
                return res.status(403).json({msg: "Você não tem permissão para acessar os favoritos deste usuário!"});
            }
        }

        const usuario = await db.query(
            "SELECT id_usuario, nome FROM usuario WHERE id_usuario = $1 AND removido = FALSE",
            [idUsuario]
        );

        if (!usuario.rowCount) {
            return res.status(404).json({msg: "Usuário não encontrado!"});
        }

        req.dadosFavorito = {idUsuario,nomeUsuario: usuario.rows[0].nome};

        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao validar o usuário!"});
    }
}
async function validarLivroFavorito(req, res, next) {
    try {
        const dados = req.body || {};
        const idLivro = Number(req.params.id_livro || dados.id_livro);

        if (!Number.isInteger(idLivro) || idLivro <= 0) {
            return res.status(400).json({msg: "Informe um ID de livro válido!"});
        }

        const livro = await db.query(
            "SELECT id_livro FROM livro WHERE id_livro = $1 AND removido = FALSE",
            [idLivro]
        );

        if (!livro.rowCount) {
            return res.status(404).json({msg: "Livro não encontrado!"});
        }

        req.dadosFavorito = req.dadosFavorito || {};
        req.dadosFavorito.idLivro = idLivro;

        next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno ao validar o livro!"});
    }
}

module.exports = {validarUsuarioFavorito, validarLivroFavorito};
