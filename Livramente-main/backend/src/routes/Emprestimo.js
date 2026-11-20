// nesse codigo, apenas os administradores conseguem ver os emprestimos de todos os usuarios. Um usuario que não é adm
// poderá ver apenas os seus empréstimos

const express = require("express");
const router = express.Router();
const db = require("../db");
const { autenticar } = require("./middlewares/Autenticacao");
const {
    validarIdEmprestimo,
    validarIdLivroEmprestimo,
    validarDadosEmprestimo
} = require("./middlewares/Validacoes");

/* METODOS*/
// GET - apenas adms podem consultar todos (ignora empréstimos removidos)
router.get("/", autenticar, async (req, res) => {
    try {
        let resultado;

        if (req.usuario.administrador) {
            resultado = await db.query(
                `SELECT e.*,
                        u.nome AS nome_usuario,
                        l.titulo AS titulo_livro
                 FROM emprestimo e
                 INNER JOIN usuario u ON e.id_usuario = u.id_usuario
                 INNER JOIN livro l ON e.id_livro = l.id_livro
                 WHERE e.removido = FALSE
                 ORDER BY e.data_solicitacao DESC`
            );
        } else {
            resultado = await db.query(
                `SELECT e.*,
                        u.nome AS nome_usuario,
                        l.titulo AS titulo_livro
                 FROM emprestimo e
                 INNER JOIN usuario u ON e.id_usuario = u.id_usuario
                 INNER JOIN livro l ON e.id_livro = l.id_livro
                 WHERE e.id_usuario = $1 AND e.removido = FALSE
                 ORDER BY e.data_solicitacao DESC`,
                [req.usuario.id_usuario]
            );
        }

        return res.status(200).json(resultado.rows);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// GET - POR ID
router.get("/:id", autenticar, validarIdEmprestimo, async (req, res) => {
    try {
        const id_emprestimo = req.idEmprestimo;

        const resultado = await db.query(
            `SELECT e.*,
                    u.nome AS nome_usuario,
                    l.titulo AS titulo_livro
             FROM emprestimo e
             INNER JOIN usuario u ON e.id_usuario = u.id_usuario
             INNER JOIN livro l ON e.id_livro = l.id_livro
             WHERE e.id_emprestimo = $1 AND e.removido = FALSE`,
            [id_emprestimo]
        );

        if (resultado.rowCount === 0) {
            return res.status(404).json({ msg: "Empréstimo não encontrado." });
        }

        const emprestimo = resultado.rows[0];

        if (
            emprestimo.id_usuario !== req.usuario.id_usuario &&
            !req.usuario.administrador
        ) {
            return res.status(403).json({ msg: "Você não tem permissão para consultar este empréstimo." });
        }

        return res.status(200).json(emprestimo);

    } catch (error) {
        console.error(error);
        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// POST - solicitar empréstimo (o livro precisa existir e não estar removido)
router.post("/", autenticar, validarIdLivroEmprestimo, async (req, res) => {
    try {
        const id_usuario = req.usuario.id_usuario;
        const id_livro = req.idLivro;

        const livro = await db.query(
            "SELECT 1 FROM livro WHERE id_livro = $1 AND removido = FALSE",
            [id_livro]
        );

        if (!livro.rowCount) {
            return res.status(404).json({ msg: "Livro não encontrado." });
        }

        const resultado = await db.query(
            `INSERT INTO emprestimo (id_usuario, id_livro)
             VALUES ($1, $2)
             RETURNING *`,
            [id_usuario, id_livro]
        );

        return res.status(201).json({
            msg: "Solicitação de empréstimo realizada com sucesso.",
            emprestimo: resultado.rows[0]
        });

    } catch (error) {
        console.error(error);

        if (error.code === "23503") {
            return res.status(404).json({ msg: "Livro não encontrado." });
        }

        if (error.code === "23505") {
            return res.status(409).json({ msg: "Você já possui uma solicitação pendente ou um empréstimo ativo deste livro." });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });
    }
});


// PUT
router.put("/:id", autenticar, validarIdEmprestimo, validarDadosEmprestimo, async (req, res) => {
    const conexao = await db.connect();

    try {
        const id_emprestimo = req.idEmprestimo;
        const novo_status = req.dadosEmprestimo.status;

        await conexao.query("BEGIN");

        // Busca o empréstimo (não removido) e bloqueia sua alteração simultânea.
        const consulta = await conexao.query(
            `SELECT *
             FROM emprestimo
             WHERE id_emprestimo = $1 AND removido = FALSE
             FOR UPDATE`,
            [id_emprestimo]
        );

        if (consulta.rowCount === 0) {
            await conexao.query("ROLLBACK");

            return res.status(404).json({ msg: "Empréstimo não encontrado." });
        }

        const emprestimo = consulta.rows[0];
        const ehAdmin = req.usuario.administrador;
        const ehDono = emprestimo.id_usuario === req.usuario.id_usuario;

        // somente o próprio usuário pode cancelar uma solicitação pendente.
        if (novo_status === "cancelado") {
            if (!ehDono || emprestimo.status !== "pendente") {
                await conexao.query("ROLLBACK");

                return res.status(403).json({ msg: "Você não pode cancelar este empréstimo." });
            }

            const resultado = await conexao.query(
                `UPDATE emprestimo
                 SET status = 'cancelado'
                 WHERE id_emprestimo = $1
                 RETURNING *`,
                [id_emprestimo]
            );

            await conexao.query("COMMIT");

            return res.status(200).json({
                msg: "Solicitação cancelada com sucesso.",
                emprestimo: resultado.rows[0]
            });
        }

        // alteraçoes exclusivas do adm
        if (!ehAdmin) {
            await conexao.query("ROLLBACK");

            return res.status(403).json({ msg: "Somente administradores podem alterar este status." });
        }

        // permite emprestimo
        if (novo_status === "aprovado") {
            if (emprestimo.status !== "pendente") {
                await conexao.query("ROLLBACK");

                return res.status(409).json({ msg: "Somente empréstimos pendentes podem ser aprovados." });
            }

            const data_prevista_devolucao = req.dadosEmprestimo.data_prevista_devolucao;

            // atualiza a quantidade de livros disponíveis para emprestimo
            const livro = await conexao.query(
                `UPDATE livro
                 SET exemplares_disponiveis = exemplares_disponiveis - 1
                 WHERE id_livro = $1
                   AND removido = FALSE
                   AND exemplares_disponiveis > 0
                 RETURNING id_livro`,
                [emprestimo.id_livro]
            );

            if (livro.rowCount === 0) {
                await conexao.query("ROLLBACK");

                return res.status(409).json({ msg: "Não há exemplares disponíveis deste livro." });
            }

            const resultado = await conexao.query(
                `UPDATE emprestimo
                 SET status = 'aprovado',
                     data_emprestimo = CURRENT_DATE,
                     data_prevista_devolucao = $1
                 WHERE id_emprestimo = $2
                 RETURNING *`,
                [data_prevista_devolucao, id_emprestimo]
            );

            await conexao.query("COMMIT");

            return res.status(200).json({
                msg: "Empréstimo aprovado com sucesso.",
                emprestimo: resultado.rows[0]
            });
        }

        // recusa um emprestimo
        if (novo_status === "recusado") {
            if (emprestimo.status !== "pendente") {
                await conexao.query("ROLLBACK");

                return res.status(409).json({ msg: "Somente empréstimos pendentes podem ser recusados." });
            }

            const resultado = await conexao.query(
                `UPDATE emprestimo
                 SET status = 'recusado'
                 WHERE id_emprestimo = $1
                 RETURNING *`,
                [id_emprestimo]
            );

            await conexao.query("COMMIT");

            return res.status(200).json({
                msg: "Solicitação recusada.",
                emprestimo: resultado.rows[0]
            });
        }

        // registra a devolução
        if (novo_status === "devolvido") {
            if (emprestimo.status !== "aprovado") {
                await conexao.query("ROLLBACK");

                return res.status(409).json({ msg: "Somente empréstimos aprovados podem ser devolvidos." });
            }

            // devolve um exemplar
            await conexao.query(
                `UPDATE livro SET exemplares_disponiveis = exemplares_disponiveis + 1
                 WHERE id_livro = $1`,
                [emprestimo.id_livro]
            );

            const resultado = await conexao.query(
                `UPDATE emprestimo
                 SET status = 'devolvido',
                     data_devolucao = CURRENT_DATE
                 WHERE id_emprestimo = $1
                 RETURNING *`,
                [id_emprestimo]
            );

            await conexao.query("COMMIT");

            return res.status(200).json({
                msg: "Devolução registrada com sucesso.",
                emprestimo: resultado.rows[0]
            });
        }

    } catch (error) {
        try { await conexao.query("ROLLBACK"); } catch (e) { }
        console.error(error);

        if (error.code === "23514") {
            return res.status(400).json({ msg: "A data prevista de devolução não pode ser anterior à data de hoje." });
        }

        if (error.code === "23505") {
            return res.status(409).json({ msg: "Este usuário já possui um empréstimo aprovado deste livro." });
        }

        return res.status(500).json({ msg: "Erro interno do servidor." });

    } finally {
        conexao.release();
    }
});


module.exports = router;
