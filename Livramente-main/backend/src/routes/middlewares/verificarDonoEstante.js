function verificarDonoEstante(req, res, next) {
    const idUsuario = Number(req.params.id_usuario);

    if (!Number.isInteger(idUsuario) || idUsuario <= 0) {
        return res.status(400).json({msg: "Informe um ID de usuário válido!"});
    }

    if (idUsuario !== req.usuario.id_usuario) {
        return res.status(403).json({msg: "Você não tem permissão para acessar esta estante!"});
    }

    next();
}

module.exports = {verificarDonoEstante};
