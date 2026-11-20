const db = require("../db");

// Remove fisicamente um arquivo do banco se ele não estiver mais associado
// a nenhum usuário (foto de perfil). Usado para corrigir a "remoção de
// arquivos sem referência": sempre que uma foto é trocada ou a conta é
// excluída, o arquivo antigo que ficou órfão é apagado.
// Aceita um executor opcional (conexão de transação) ou usa o pool padrão.
async function removerArquivoSeOrfao(idArquivo, executor = db) {
    if (idArquivo === null || idArquivo === undefined) {
        return false;
    }

    const emUso = await executor.query(
        `SELECT 1 FROM usuario WHERE id_foto_perfil = $1 LIMIT 1`,
        [idArquivo]
    );

    if (emUso.rowCount > 0) {
        return false;
    }

    await executor.query(
        `DELETE FROM arquivo WHERE id_arquivo = $1`,
        [idArquivo]
    );

    return true;
}

// Apaga de uma vez todos os arquivos que não são referenciados por nenhum
// usuário. Serve como "faxina" geral de uploads órfãos.
async function limparArquivosOrfaos(executor = db) {
    const r = await executor.query(
        `DELETE FROM arquivo a
          WHERE NOT EXISTS (
              SELECT 1 FROM usuario u WHERE u.id_foto_perfil = a.id_arquivo
          )
          RETURNING id_arquivo`
    );
    return r.rowCount;
}

module.exports = { removerArquivoSeOrfao, limparArquivosOrfaos };
