const jwt = require("jsonwebtoken");
const db = require("../../db");

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
    throw new Error("Variável de ambiente JWT_SECRET não definida!");
}

const JWT_EXPIRA_EM = process.env.JWT_EXPIRES_IN || "2h";

// Gera o token de autenticação.
function gerarToken(usuario) {
    return jwt.sign(
        {
            data: {
                nome: usuario.nome,
                administrador: usuario.administrador
            }
        },
        JWT_SECRET,
        {
            algorithm: "HS256",
            subject: String(usuario.id_usuario),
            expiresIn: JWT_EXPIRA_EM,
            notBefore: 0,
            issuer: "livramente-api"
        }
    );
}

// Verifica o token e identifica o usuário.
async function autenticar(req, res, next) {
    try {
        const cabecalho = req.headers.authorization || "";
        const partes = cabecalho.trim().split(/\s+/);

        if ( partes.length !== 2 || partes[0] !== "Bearer" || !partes[1]) {
            return res.status(401).json({msg: "Token não informado. Use o cabeçalho 'Authorization: Bearer <token>'."});
        }

        const token = partes[1];

        let payload;

        try {
            payload = jwt.verify(token, JWT_SECRET, {algorithms: ["HS256"], issuer: "livramente-api"});

        } catch (error) {
            if (error.name === "TokenExpiredError") {
                return res.status(401).json({msg: "Token expirado. Faça login novamente."});
            }

            return res.status(401).json({msg: "Token inválido."});
        }

        // Verifica se o ID do usuário no token é válido.
        const idUsuario = Number(payload.sub);

        if (typeof payload.sub !== "string" || !/^[1-9]\d*$/.test(payload.sub) ||!Number.isSafeInteger(idUsuario)) {
            return res.status(401).json({msg: "Identificação do usuário inválida."});
        }

        // Confere se o usuário ainda existe no banco e não foi removido (exclusão lógica).
        const resultado = await db.query(
            `SELECT id_usuario, nome, email, administrador
             FROM usuario
             WHERE id_usuario = $1 AND removido = FALSE`,
            [idUsuario]
        );

        if (resultado.rowCount === 0) {
            return res.status(401).json({msg: "Usuário do token não existe mais."});
        }

        // Disponibiliza os dados para as próximas etapas.
        req.usuario = resultado.rows[0];

        return next();

    } catch (error) {
        console.error(error);
        return res.status(500).json({msg: "Erro interno do servidor."});
    }
}

// Verifica se o usuário autenticado é administrador.
function apenasAdmin(req, res, next) {
    if (!req.usuario || !req.usuario.administrador) {
        return res.status(403).json({msg: "Acesso restrito a administradores."});
    }

    return next();
}

module.exports = { gerarToken, autenticar, apenasAdmin};
