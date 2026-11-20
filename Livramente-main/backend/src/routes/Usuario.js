const express = require("express");
const router = express.Router();
const db = require("../db");
const { gerarHash } = require("../utils/senha");
const { removerArquivoSeOrfao } = require("../utils/arquivos");

// MIDDLEWARES
const { autenticar, apenasAdmin } = require("./middlewares/Autenticacao");
const { tratarId, validarCadastroUsuario, validarAtualizacaoUsuario } = require("./middlewares/validarUsuario");

// GET - Buscar usuário por ID (público: mostra apenas dados básicos)
router.get("/:id", async (req, res) => {
    try {
        const id = tratarId(req.params.id);

        if (!id) {
            return res.status(400).json({ msg: "ID é inválido!" });
        }

        const resultado = await db.query(
            `SELECT id_usuario, nome, foto_perfil, id_foto_perfil, data_cadastro
             FROM usuario
             WHERE id_usuario = $1 AND removido = FALSE`,
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ msg: "Usuário não foi encontrado!" });
        }

        return res.status(200).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor!" });
    }
});

// GET - Listar todos os usuários (apenas administradores)
router.get("/", autenticar, apenasAdmin, async (req, res) => {
    try {
        const resultado = await db.query(
            `SELECT id_usuario, nome, email, administrador,
                    foto_perfil, id_foto_perfil, data_cadastro
             FROM usuario
             WHERE removido = FALSE
             ORDER BY id_usuario`
        );

        return res.status(200).json(resultado.rows);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// POST - Cadastrar usuário (público; valida tudo antes de gerar o hash)
router.post("/", validarCadastroUsuario, async (req, res) => {
    try {
        const dados = req.dadosUsuario;

        // O bcrypt só é executado depois das validações e da verificação de e-mail duplicado.
        const senhaHash = await gerarHash(dados.senha);

        const resultado = await db.query(
            `INSERT INTO usuario
                (nome, email, senha_hash, administrador, foto_perfil, id_foto_perfil)
             VALUES
                ($1, $2, $3, $4, $5, $6)
             RETURNING id_usuario, nome, email, administrador,
                       foto_perfil, id_foto_perfil, data_cadastro`,
            [
                dados.nome,
                dados.email,
                senhaHash,
                false,
                dados.foto_perfil,
                dados.id_foto_perfil
            ]
        );

        return res.status(201).json(resultado.rows[0]);
    } catch (error) {
        console.error(error);
        if (error.code === "23505") {
            return res.status(409).json({ msg: "Já existe um usuário com esse e-mail." });
        }
        if (error.code === "23503") {
            return res.status(400).json({ msg: "A foto informada não existe." });
        }
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// PUT - Atualizar usuário (somente o próprio usuário)
router.put("/:id", autenticar, validarAtualizacaoUsuario, async (req, res) => {
    try {
        const dados = req.dadosUsuario;

        // Executa dentro de transação para, ao trocar a foto, remover
        // automaticamente o arquivo antigo que ficar sem referência.
        const atualizado = await db.transaction(async (conexao) => {
            const resultado = await conexao.query(
                `UPDATE usuario
                 SET nome = $1,
                     email = $2,
                     foto_perfil = $3,
                     id_foto_perfil = $4
                 WHERE id_usuario = $5 AND removido = FALSE
                 RETURNING id_usuario, nome, email, administrador,
                           foto_perfil, id_foto_perfil, data_cadastro`,
                [
                    dados.nome,
                    dados.email,
                    dados.foto_perfil,
                    dados.id_foto_perfil,
                    dados.id
                ]
            );

            // Se a foto mudou, apaga o arquivo anterior caso tenha ficado órfão.
            if (resultado.rowCount > 0 &&
                dados.id_foto_anterior &&
                dados.id_foto_anterior !== dados.id_foto_perfil) {
                await removerArquivoSeOrfao(dados.id_foto_anterior, conexao);
            }

            return resultado;
        });

        if (atualizado.rowCount === 0) {
            return res.status(404).json({ msg: "Usuário não encontrado." });
        }

        return res.status(200).json(atualizado.rows[0]);
    } catch (error) {
        console.error(error);

        if (error.code === "23505") {
            return res.status(409).json({ msg: "Já existe outro usuário com esse e-mail." });
        }

        if (error.code === "23503") {
            return res.status(400).json({ msg: "A foto informada não existe." });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// DELETE - Excluir a própria conta (EXCLUSÃO LÓGICA: marca removido = TRUE)
router.delete("/:id", autenticar, async (req, res) => {
    try {
        const id = tratarId(req.params.id);

        if (!id) {
            return res.status(400).json({ msg: "ID é inválido!" });
        }

        if (Number(req.usuario.id_usuario) !== id) {
            return res.status(403).json({msg: "Você só pode excluir o seu próprio usuário."});
        }

        // Exclusão lógica: o registro permanece no banco, apenas marcado como removido.
        // Os registros relacionados (empréstimos, resenhas, etc.) também permanecem,
        // mas deixam de aparecer porque todas as consultas ignoram itens removidos.
        const resultado = await db.query(
            `UPDATE usuario
             SET removido = TRUE
             WHERE id_usuario = $1 AND removido = FALSE
             RETURNING id_usuario, nome, email`,
            [id]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ msg: "Usuário não encontrado." });
        }

        return res.status(200).json({
            msg: "Usuário excluído com sucesso.",
            usuario: resultado.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

module.exports = router;
