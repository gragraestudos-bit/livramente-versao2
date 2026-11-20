const bcrypt = require("bcrypt");

// Custo do bcrypt.
const CUSTO = 10;

const SENHA_MIN = 6;
const SENHA_MAX = 72;

// Valida a senha.
function validarSenha(senha) {
    if (typeof senha !== "string" || !senha) {
        throw new Error("Senha é obrigatória!");
    }

    if (senha.length < SENHA_MIN) {
        throw new Error(`Senha deve ter no mínimo ${SENHA_MIN} caracteres!`);
    }

    if (Buffer.byteLength(senha, "utf8") > SENHA_MAX) {
        throw new Error(`Senha deve ter no máximo ${SENHA_MAX} caracteres!`);
    }

    return senha;
}

// Gera o hash da senha.
async function gerarHash(senha) {
    return bcrypt.hash(validarSenha(senha), CUSTO);
}

// Compara a senha informada com o hash armazenado.
async function conferirSenha(senha, hash) {
    return bcrypt.compare(senha, hash);
}

module.exports = { gerarHash, conferirSenha, validarSenha };
