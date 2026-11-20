const { tratarEmail } = require("./validarUsuario");

// Valida os dados recebidos no login.
function validarLogin(req, res, next) {
    const dados = req.body || {};

    const email = tratarEmail(dados.email);
    const senha = dados.senha;

    if (email.erro) {
        return res.status(400).json({ msg: email.erro });
    }

    if (typeof senha !== "string" || !senha) {
        return res.status(400).json({
            msg: "Senha é obrigatória!"
        });
    }

    req.dadosLogin = { email: email.valor, senha };

    return next();
}

module.exports = { validarLogin };
