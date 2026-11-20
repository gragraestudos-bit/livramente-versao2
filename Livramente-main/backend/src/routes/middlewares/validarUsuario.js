const db = require("../../db");
const { validarSenha } = require("../../utils/senha");

const LIMITES = {nome: 100,email: 150,foto_perfil: 255};

// Mesmo formato do CHECK chk_usuario_email do banco.
const REGEX_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

function tratarId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// Tratamento para o nome
function tratarNome(nome) {
    if (typeof nome !== "string" || !nome.trim()) {
        return { erro: "Nome inválido." };
    }

    const valor = nome.trim();

    if (valor.length > LIMITES.nome) {
        return { erro: `Nome deve ter no máximo ${LIMITES.nome} caracteres.` };
    }

    return { valor };
}

// Tratamento para o email
function tratarEmail(email) {
    if (typeof email !== "string") {
        return { erro: "E-mail inválido." };
    }

    const valor = email.trim().toLowerCase();

    if (valor.length > LIMITES.email) {
        return { erro: `E-mail deve ter no máximo ${LIMITES.email} caracteres.` };
    }

    if (!REGEX_EMAIL.test(valor)) {
        return { erro: "E-mail inválido." };
    }

    return { valor };
}

// quando der undefined quer dizer que não foi informado | null = remover foto.
function tratarFoto(foto) {
    if (foto === undefined) {
        return { valor: undefined };
    }

    if (foto === null || foto === "") {
        return { valor: null };
    }

    if (typeof foto !== "string") {
        return { erro: "Foto de perfil inválida." };
    }

    const valor = foto.trim();

    if (valor.length > LIMITES.foto_perfil) {
        return {erro: `Foto de perfil deve ter no máximo ${LIMITES.foto_perfil} caracteres.`};
    }

    return { valor: valor || null };
}

// undefined = não informado | null = remover associação da foto.
function tratarIdFoto(id) {
    if (id === undefined) {
        return { valor: undefined };
    }

    if (id === null || id === "") {
        return { valor: null };
    }

    const valor = Number(id);

    if (!Number.isInteger(valor) || valor <= 0) {
        return { erro: "ID da foto de perfil inválido." };
    }

    return { valor };
}

async function verificarArquivo(idFoto) {
    if (idFoto === null || idFoto === undefined) {
        return true;
    }

    const resultado = await db.query(
        "SELECT id_arquivo FROM arquivo WHERE id_arquivo = $1",
        [idFoto]
    );

    return resultado.rowCount > 0;
}

// Valida todos os dados antes de a rota gerar o hash da senha.
// Não exige autenticação: o cadastro continua PÚBLICO, inclusive quando é
// enviada uma foto de perfil (o upload da imagem também é público).
async function validarCadastroUsuario(req, res, next) {
    try {
        const dados = req.body || {};

        const nome = tratarNome(dados.nome);
        const email = tratarEmail(dados.email);
        const foto = tratarFoto(dados.foto_perfil);
        const idFoto = tratarIdFoto(dados.id_foto_perfil);

        if (nome.erro) {
            return res.status(400).json({ msg: nome.erro });
        }

        if (email.erro) {
            return res.status(400).json({ msg: email.erro });
        }

        if (foto.erro) {
            return res.status(400).json({ msg: foto.erro });
        }

        if (idFoto.erro) {
            return res.status(400).json({ msg: idFoto.erro });
        }

        // Valida a senha sem gerar o hash.
        let senha;
        try {
            senha = validarSenha(dados.senha);
        } catch (error) {
            return res.status(400).json({ msg: error.message });
        }

        // Verifica duplicidade (apenas entre usuários ativos) antes do bcrypt.
        const usuarioExistente = await db.query(
            `SELECT id_usuario
             FROM usuario
             WHERE email = $1 AND removido = FALSE`,
            [email.valor]
        );

        if (usuarioExistente.rowCount > 0) {
            return res.status(409).json({msg: "Já existe um usuário com esse e-mail!"});
        }

        if (!(await verificarArquivo(idFoto.valor))) {
            return res.status(400).json({ msg: "A foto informada não existe!" });
        }

        req.dadosUsuario = {
            nome: nome.valor,
            email: email.valor,
            senha,
            foto_perfil: foto.valor ?? null,
            id_foto_perfil: idFoto.valor ?? null
        };

        return next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno ao validar o cadastro do usuário." });
    }
}

// Valida a atualização e preserva os campos de foto que não forem enviados
async function validarAtualizacaoUsuario(req, res, next) {
    try {
        const id = tratarId(req.params.id);

        if (!id) {
            return res.status(400).json({ msg: "ID inválido." });
        }

        if (Number(req.usuario.id_usuario) !== id) {
            return res.status(403).json({msg: "Você só pode alterar o seu próprio usuário."});
        }

        const dados = req.body || {};
        const nome = tratarNome(dados.nome);
        const email = tratarEmail(dados.email);

        if (nome.erro) {
            return res.status(400).json({ msg: nome.erro });
        }

        if (email.erro) {
            return res.status(400).json({ msg: email.erro });
        }

        const usuarioAtual = await db.query(
            `SELECT foto_perfil, id_foto_perfil
             FROM usuario
             WHERE id_usuario = $1 AND removido = FALSE`,
            [id]
        );

        if (usuarioAtual.rowCount === 0) {
            return res.status(404).json({ msg: "Usuário não encontrado." });
        }

        const emailExistente = await db.query(
            `SELECT id_usuario
             FROM usuario
             WHERE email = $1
               AND id_usuario <> $2
               AND removido = FALSE`,
            [email.valor, id]
        );

        if (emailExistente.rowCount > 0) {
            return res.status(409).json({msg: "Já existe outro usuário com esse e-mail."});
        }

        const foto = tratarFoto(dados.foto_perfil);
        const idFoto = tratarIdFoto(dados.id_foto_perfil);

        if (foto.erro) {
            return res.status(400).json({ msg: foto.erro });
        }

        if (idFoto.erro) {
            return res.status(400).json({ msg: idFoto.erro });
        }

        const fotoPerfil = foto.valor === undefined
            ? usuarioAtual.rows[0].foto_perfil
            : foto.valor;

        const idFotoPerfil = idFoto.valor === undefined
            ? usuarioAtual.rows[0].id_foto_perfil
            : idFoto.valor;

        if (!(await verificarArquivo(idFotoPerfil))) {
            return res.status(400).json({ msg: "A foto informada não existe." });
        }

        req.dadosUsuario = {
            id,
            nome: nome.valor,
            email: email.valor,
            foto_perfil: fotoPerfil,
            id_foto_perfil: idFotoPerfil,
            // guarda a foto anterior para a rota remover o arquivo se ficar órfão
            id_foto_anterior: usuarioAtual.rows[0].id_foto_perfil
        };

        return next();
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno ao validar a atualização do usuário." });
    }
}

module.exports = {
    LIMITES,
    tratarId,
    tratarNome,
    tratarEmail,
    tratarFoto,
    tratarIdFoto,
    validarCadastroUsuario,
    validarAtualizacaoUsuario
};
