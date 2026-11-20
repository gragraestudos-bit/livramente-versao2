function tratarId(valor) {
    const id = Number(valor);
    return Number.isInteger(id) && id > 0 ? id : null;
}

function tratarData(valor) {
    if (typeof valor !== "string") return null;

    if (!/^\d{4}-\d{2}-\d{2}$/.test(valor)) return null;

    const data = new Date(valor + "T00:00:00Z");

    if (Number.isNaN(data.getTime())) return null;

    if (data.toISOString().slice(0, 10) !== valor) return null;

    return valor;
}

function tratarTexto(valor) {
    if (typeof valor !== "string") return null;

    valor = valor.trim();

    return valor.length > 0 ? valor : null;
}

function tratarTextoOpcional(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    if (typeof valor !== "string") return undefined;

    valor = valor.trim();

    return valor.length > 0 ? valor : null;
}

function tratarNumeroOpcional(valor) {
    if (valor === undefined || valor === null || valor === "") {
        return null;
    }

    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return undefined;
    }

    return numero;
}

function tratarQuantidade(valor) {
    const numero = Number(valor);

    if (!Number.isInteger(numero) || numero <= 0) {
        return null;
    }

    return numero;
}

function tratarNota(valor) {
    const nota = Number(valor);

    if (!Number.isInteger(nota) || nota < 1 || nota > 5) {
        return null;
    }

    return nota;
}

function tratarISBN(isbn) {
    if (isbn === undefined || isbn === null || isbn === "") {
        return null;
    }

    if (typeof isbn !== "string") return undefined;
    isbn = isbn.trim();

    if (isbn === "") return null;
    return /^[0-9]{13}$/.test(isbn) ? isbn : undefined;
}

module.exports = {
    tratarId,
    tratarData,
    tratarTexto,
    tratarTextoOpcional,
    tratarNumeroOpcional,
    tratarQuantidade,
    tratarNota,
    tratarISBN
};