const express = require("express");
const router = express.Router();
const db = require("../../db");
const multer = require("multer");
const { autenticar, apenasAdmin } = require("./Autenticacao");
const { limparArquivosOrfaos } = require("../../utils/arquivos");

const TAMANHO_MAXIMO = 5 * 1024 * 1024; // 5 MB (armazenamento em memória -> BD)

// Abordagem da aula: arquivo inteiro na memória (memoryStorage) e salvo em BYTEA.
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: TAMANHO_MAXIMO, files: 1 }
});

// Só imagens (fotos de perfil e capas de livros). Servir outros tipos "inline"
// (ex.: HTML ou SVG) permitiria executar scripts no navegador.
const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

// O mimetype vem do cliente e pode ser falso, então confere os primeiros bytes.
function tipoReal(buffer) {
    if (buffer.length < 12) return null;
    if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
    if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return "image/png";
    const inicio = buffer.subarray(0, 6).toString("ascii");
    if (inicio === "GIF87a" || inicio === "GIF89a") return "image/gif";
    if (buffer.subarray(0, 4).toString("ascii") === "RIFF" &&
        buffer.subarray(8, 12).toString("ascii") === "WEBP") return "image/webp";
    return null;
}

function tratarId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

// POST /arquivos  (PÚBLICO) — multipart/form-data, campo "arquivo".
// É público de propósito para permitir o CADASTRO de usuário com foto de perfil
// SEM exigir autenticação prévia: o novo usuário ainda não possui token.
// A segurança é mantida por: tipo permitido + conferência dos bytes reais +
// limite de 5 MB. Uploads que não forem associados a nenhum usuário são
// considerados órfãos e podem ser apagados (ver limpeza de órfãos).
router.post("/", upload.single("arquivo"), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ msg: "Nenhum arquivo foi enviado. Use o campo 'arquivo'." });
        }

        const { originalname, mimetype, size, buffer } = req.file;

        if (!TIPOS_PERMITIDOS.includes(mimetype) || tipoReal(buffer) !== mimetype) {
            return res.status(415).json({
                msg: "Tipo de arquivo não permitido. Envie uma imagem JPEG, PNG, WEBP ou GIF."
            });
        }

        const r = await db.query(
            `INSERT INTO arquivo (nome_original, tipo_mime, tamanho_bytes, conteudo)
             VALUES ($1, $2, $3, $4)
             RETURNING id_arquivo, nome_original, tipo_mime, tamanho_bytes, criado_em`,
            [originalname.slice(0, 255), mimetype, size, buffer]
        );

        return res.status(201).json({
            msg: "Arquivo salvo com sucesso.",
            id_arquivo: r.rows[0].id_arquivo,
            arquivo: r.rows[0]
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro ao salvar o arquivo no banco de dados." });
    }
});

// DELETE /arquivos/orfaos  (apenas administradores) — faxina de uploads sem referência.
router.delete("/orfaos", autenticar, apenasAdmin, async (req, res) => {
    try {
        const quantidade = await limparArquivosOrfaos();
        return res.status(200).json({
            msg: "Arquivos órfãos removidos com sucesso.",
            removidos: quantidade
        });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro ao remover arquivos órfãos." });
    }
});

// GET /arquivos  — lista os metadados (sem o conteúdo)
router.get("/", async (req, res) => {
    try {
        const r = await db.query(
            `SELECT id_arquivo, nome_original, tipo_mime, tamanho_bytes, criado_em
             FROM arquivo
             ORDER BY id_arquivo`
        );
        return res.status(200).json({ arquivos: r.rows });
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});

// GET /arquivos/:id  — devolve a imagem (inline).
// Pública de propósito: a tag <img src="..."> não consegue enviar o token.
router.get("/:id", async (req, res) => {
    try {
        const id = tratarId(req.params.id);
        if (!id) {
            return res.status(400).json({ msg: "ID de arquivo inválido!" });
        }

        const r = await db.query(
            `SELECT nome_original, tipo_mime, tamanho_bytes, conteudo
             FROM arquivo
             WHERE id_arquivo = $1`,
            [id]
        );

        if (!r.rowCount) {
            return res.status(404).json({ msg: "Arquivo não encontrado." });
        }

        const arquivo = r.rows[0];
        res.setHeader("Content-Type", arquivo.tipo_mime);
        res.setHeader("Content-Length", arquivo.tamanho_bytes);
        res.setHeader("X-Content-Type-Options", "nosniff");
        res.setHeader(
            "Content-Disposition",
            `inline; filename*=UTF-8''${encodeURIComponent(arquivo.nome_original)}`
        );
        return res.status(200).send(arquivo.conteudo);
    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro ao buscar o arquivo." });
    }
});

// Erros do multer (arquivo grande demais, campo errado...)
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(413).json({ msg: "Arquivo muito grande. O limite é de 5 MB." });
        }
        return res.status(400).json({ msg: "Erro no envio do arquivo. Use o campo 'arquivo'." });
    }
    next(err);
});

module.exports = router;
