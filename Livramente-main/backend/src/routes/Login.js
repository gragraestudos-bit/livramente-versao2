const express = require("express");
const bcrypt = require("bcrypt");
const router = express.Router();
const db = require("../db");

const { conferirSenha } = require("../utils/senha");
const { gerarToken, autenticar } = require("./middlewares/Autenticacao");
const { validarLogin } = require("./middlewares/validarLogin");

// Hash falso para evitar diferença no tempo de resposta
// quando o e-mail não existe.
const HASH_FALSO = bcrypt.hashSync("hash-falso", 10);

// POST /autenticacao/login
router.post("/login", validarLogin, async (req, res) => {
    try {
        const { email, senha } = req.dadosLogin;

        // Usuários removidos (exclusão lógica) não conseguem mais entrar.
        const resultado = await db.query(
            `SELECT id_usuario, nome, email, senha_hash,
                    administrador, foto_perfil, id_foto_perfil
             FROM usuario
             WHERE email = $1 AND removido = FALSE`,
            [email]
        );

        const usuario = resultado.rows[0];

        // Compara com o hash real ou com o hash falso.
        const senhaCorreta = await conferirSenha(
            senha,
            usuario ? usuario.senha_hash : HASH_FALSO
        );

        if (!usuario || !senhaCorreta) {
            return res.status(401).json({msg: "Email ou senha inválidos."});
        }

        return res.status(200).json({
            msg: "Login realizado com sucesso!",
            token: gerarToken(usuario),
            usuario: {
                id_usuario: usuario.id_usuario,
                nome: usuario.nome,
                email: usuario.email,
                administrador: usuario.administrador,
                foto_perfil: usuario.foto_perfil,
                id_foto_perfil: usuario.id_foto_perfil
            }
        });

    } catch (error) {
        console.error(error);

        return res.status(500).json({
            msg: "Erro interno do servidor."
        });
    }
});

// GET /autenticacao/me
// Retorna os dados do usuário autenticado.
router.get("/me", autenticar, (req, res) => {
    return res.status(200).json({usuario: req.usuario});
});

module.exports = router;
