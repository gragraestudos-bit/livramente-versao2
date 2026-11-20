-- LIVRAMENTE - BANCO DE DADOS
--
-- Observação sobre EXCLUSÃO LÓGICA (soft delete):
-- As entidades principais possuem a coluna booleana "removido".
-- Nenhum registro é apagado fisicamente pelas rotas: o DELETE marca
-- removido = TRUE e todas as consultas ignoram os registros removidos.
-- A tabela "arquivo" é a única exceção (removida fisicamente quando fica órfã).

-- 1. USUARIO
CREATE TABLE IF NOT EXISTS usuario (
    id_usuario SERIAL PRIMARY KEY,
    nome VARCHAR(100) NOT NULL,
    email VARCHAR(150) NOT NULL,
    senha_hash VARCHAR(60) NOT NULL,
    administrador BOOLEAN NOT NULL DEFAULT FALSE,
    foto_perfil VARCHAR(255),
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_usuario_nome
        CHECK (nome ~ '[^[:space:]]'),
    CONSTRAINT chk_usuario_email
        CHECK (email ~* '^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$'),
    CONSTRAINT chk_usuario_email_minusculo
        CHECK (email = LOWER(email))
);

-- E-mail único apenas entre os usuários NÃO removidos (permite reaproveitar
-- o e-mail de uma conta que foi excluída logicamente).
CREATE UNIQUE INDEX IF NOT EXISTS uq_usuario_email_ativo
    ON usuario (email)
    WHERE removido = FALSE;

-- 2. LIVRO
CREATE TABLE IF NOT EXISTS livro (
    id_livro SERIAL PRIMARY KEY,
    titulo VARCHAR(200) NOT NULL,
    autor VARCHAR(150) NOT NULL,
    genero VARCHAR(80) NOT NULL,
    sinopse TEXT,
    capa VARCHAR(255),
    isbn VARCHAR(13),
    editora VARCHAR(150),
    ano_publicacao INTEGER,
    numero_paginas INTEGER,
    quantidade_exemplares INTEGER NOT NULL DEFAULT 1,
    exemplares_disponiveis INTEGER NOT NULL DEFAULT 1,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_cadastro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT chk_livro_titulo
        CHECK (titulo ~ '[^[:space:]]'),
    CONSTRAINT chk_livro_autor
        CHECK (autor ~ '[^[:space:]]'),
    CONSTRAINT chk_livro_genero
        CHECK (genero ~ '[^[:space:]]'),
    CONSTRAINT chk_livro_isbn
        CHECK (isbn IS NULL OR isbn ~ '^[0-9]{13}$'),
    CONSTRAINT chk_livro_ano
        CHECK (ano_publicacao IS NULL OR ano_publicacao > 0),
    CONSTRAINT chk_livro_paginas
        CHECK (numero_paginas IS NULL OR numero_paginas > 0),
    CONSTRAINT chk_livro_editora
        CHECK (editora IS NULL OR editora ~ '[^[:space:]]'),
    CONSTRAINT chk_livro_sinopse
        CHECK (sinopse IS NULL OR sinopse ~ '[^[:space:]]'),
    CONSTRAINT chk_livro_quantidade
        CHECK (quantidade_exemplares > 0),
    CONSTRAINT chk_livro_disponiveis
        CHECK (exemplares_disponiveis >= 0
           AND exemplares_disponiveis <= quantidade_exemplares)
);

-- ISBN único apenas entre os livros NÃO removidos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_livro_isbn_ativo
    ON livro (isbn)
    WHERE removido = FALSE AND isbn IS NOT NULL;

-- 3. EMPRESTIMO.
CREATE TABLE IF NOT EXISTS emprestimo (
    id_emprestimo SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_livro INTEGER NOT NULL,
    data_solicitacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    data_emprestimo DATE,
    data_prevista_devolucao DATE,
    data_devolucao DATE,
    status VARCHAR(20) NOT NULL DEFAULT 'pendente',
    removido BOOLEAN NOT NULL DEFAULT FALSE,

    CONSTRAINT fk_emprestimo_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_emprestimo_livro
        FOREIGN KEY (id_livro) REFERENCES livro(id_livro)
        ON DELETE RESTRICT,
    CONSTRAINT chk_emprestimo_status
        CHECK (status IN ('pendente', 'aprovado', 'devolvido', 'recusado', 'cancelado')),
    CONSTRAINT chk_emprestimo_inicio
        CHECK (data_emprestimo IS NULL OR
               data_emprestimo >= CAST(data_solicitacao AS DATE)),
    CONSTRAINT chk_emprestimo_prazo
        CHECK (data_prevista_devolucao IS NULL OR data_emprestimo IS NULL
               OR data_prevista_devolucao >= data_emprestimo),
    CONSTRAINT chk_emprestimo_devolucao
        CHECK (data_devolucao IS NULL OR data_emprestimo IS NULL
               OR data_devolucao >= data_emprestimo),
    CONSTRAINT chk_emprestimo_sem_retirada
        CHECK (status NOT IN ('pendente', 'recusado', 'cancelado') OR
               (data_emprestimo IS NULL AND
                data_prevista_devolucao IS NULL AND
                data_devolucao IS NULL)),
    CONSTRAINT chk_emprestimo_com_retirada
        CHECK (status NOT IN ('aprovado', 'devolvido') OR
               (data_emprestimo IS NOT NULL AND
                data_prevista_devolucao IS NOT NULL)),
    CONSTRAINT chk_emprestimo_aprovado
        CHECK (status <> 'aprovado' OR data_devolucao IS NULL),
    CONSTRAINT chk_emprestimo_devolvido
        CHECK (status <> 'devolvido' OR data_devolucao IS NOT NULL)
);

-- Restrições de unicidade considerando apenas empréstimos não removidos.
CREATE UNIQUE INDEX IF NOT EXISTS uq_emprestimo_usuario_livro_aprovado
    ON emprestimo (id_usuario, id_livro)
    WHERE status = 'aprovado' AND removido = FALSE;

CREATE UNIQUE INDEX IF NOT EXISTS uq_emprestimo_pendente_usuario_livro
    ON emprestimo (id_usuario, id_livro)
    WHERE status = 'pendente' AND removido = FALSE;

-- 4. RESENHA
CREATE TABLE IF NOT EXISTS resenha (
    id_resenha SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_livro INTEGER NOT NULL,
    texto TEXT NOT NULL,
    nota SMALLINT NOT NULL,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_publicacao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_resenha_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_resenha_livro
        FOREIGN KEY (id_livro) REFERENCES livro(id_livro)
        ON DELETE RESTRICT,
    CONSTRAINT chk_resenha_texto
        CHECK (texto ~ '[^[:space:]]'),
    CONSTRAINT chk_resenha_nota
        CHECK (nota BETWEEN 1 AND 5)
);

-- Uma resenha ativa por usuário/livro (ignora as removidas logicamente).
CREATE UNIQUE INDEX IF NOT EXISTS uq_resenha_usuario_livro_ativa
    ON resenha (id_usuario, id_livro)
    WHERE removido = FALSE;

-- 5. COMENTARIO
CREATE TABLE IF NOT EXISTS comentario (
    id_comentario SERIAL PRIMARY KEY,
    id_usuario INTEGER NOT NULL,
    id_resenha INTEGER NOT NULL,
    texto TEXT NOT NULL,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_comentario TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_comentario_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_comentario_resenha
        FOREIGN KEY (id_resenha) REFERENCES resenha(id_resenha)
        ON DELETE CASCADE,
    CONSTRAINT chk_comentario_texto
        CHECK (texto ~ '[^[:space:]]')
);

-- 6. CURTIDA (relacao muitos-para-muitos)
CREATE TABLE IF NOT EXISTS curtida (
    id_usuario INTEGER NOT NULL,
    id_resenha INTEGER NOT NULL,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_curtida TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_curtida PRIMARY KEY (id_usuario, id_resenha),
    CONSTRAINT fk_curtida_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_curtida_resenha
        FOREIGN KEY (id_resenha) REFERENCES resenha(id_resenha)
        ON DELETE CASCADE
);

-- 7. FAVORITO (relacao muitos-para-muitos)
CREATE TABLE IF NOT EXISTS favorito (
    id_usuario INTEGER NOT NULL,
    id_livro INTEGER NOT NULL,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_favorito TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_favorito PRIMARY KEY (id_usuario, id_livro),
    CONSTRAINT fk_favorito_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_favorito_livro
        FOREIGN KEY (id_livro) REFERENCES livro(id_livro)
        ON DELETE RESTRICT
);

-- 8. ESTANTE (um livro em apenas uma categoria por usuario)
CREATE TABLE IF NOT EXISTS estante (
    id_usuario INTEGER NOT NULL,
    id_livro INTEGER NOT NULL,
    categoria VARCHAR(20) NOT NULL,
    removido BOOLEAN NOT NULL DEFAULT FALSE,
    data_adicao TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT pk_estante PRIMARY KEY (id_usuario, id_livro),
    CONSTRAINT fk_estante_usuario
        FOREIGN KEY (id_usuario) REFERENCES usuario(id_usuario)
        ON DELETE RESTRICT,
    CONSTRAINT fk_estante_livro
        FOREIGN KEY (id_livro) REFERENCES livro(id_livro)
        ON DELETE RESTRICT,
    CONSTRAINT chk_estante_categoria
        CHECK (categoria IN ('quero_ler', 'lendo', 'ja_li'))
);

-- INSERCAO DE DADOS - LIVRAMENTE

-- 1. USUARIO
INSERT INTO usuario
(nome, email, senha_hash, administrador)
VALUES
('Ana Fargoni', 'ana.fargoni@gmail.com',
'$2b$10$f2GzXwZBK4xcrsOk7deEOeR8qCwFTdNh7cDNcKtHcRfAMtnhkB9hi',
TRUE),

('Grazi Tonelli', 'gra.tonelli@gmail.com',
'$2b$10$EwzoyQNO2mvKg4jGRPHnq.Ng3AJcL2KRRM68LQPuX7nqkXoFjqvSS',
FALSE),

('Sophia Silva', 'sophia.silva@gmail.com',
'$2b$10$lSm5KmJ3g6K/y.AepLsvjuDumsXzctDBDU8pb/B3uOhLYedSMPAH.',
FALSE),

('Guilherme Batista', 'gui.batista@gmail.com',
'$2b$10$9UG/JG2UDVwA6kv.zDwF/.9O1k.r31sPK03IZZ/kfBwnWiOAb.7AW',
FALSE),

('Ester Piscioneri', 'ester.piscioneri@gmail.com',
'$2b$10$1AsUGojeICizAOxMSc9g5eZvjUac26K1d4XBN8snqgrPTJS5.P9Se',
FALSE),

('Bárbara Thomé', 'barbara.thome@gmail.com',
'$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy',
FALSE);

-- 2. LIVRO
INSERT INTO livro
(titulo, autor, genero, sinopse, editora,
 ano_publicacao, numero_paginas,
 quantidade_exemplares, exemplares_disponiveis)
VALUES
('Dom Casmurro', 'Machado de Assis', 'Romance',
 'Narrativa sobre Bentinho, Capitu e as incertezas do ciúme.',
 'Editora Exemplo', 1899, 256, 5, 5),

('O Cortiço', 'Aluísio Azevedo', 'Naturalismo',
 'Retrato das relações sociais em um cortiço brasileiro.',
 'Editora Exemplo', 1890, 304, 3, 3),

('Memórias Póstumas de Brás Cubas', 'Machado de Assis',
 'Romance',
 'Um narrador conta sua vida após a morte, com ironia e crítica social.',
 'Editora Exemplo', 1881, 240, 4, 4),

('A Moreninha', 'Joaquim Manuel de Macedo', 'Romance',
 'História de amor marcada por promessas e lembranças da infância.',
 'Editora Exemplo', 1844, 192, 2, 2),

('O Alienista', 'Machado de Assis', 'Novela',
 'Um médico investiga os limites entre a razão e a loucura.',
 'Editora Exemplo', 1882, 96, 6, 6);

-- 3. EMPRESTIMO
INSERT INTO emprestimo
(id_usuario, id_livro, data_solicitacao,
 data_emprestimo, data_prevista_devolucao,
 data_devolucao, status)
VALUES
(2, 1, '2026-10-01 09:00:00',
 '2026-10-02', '2026-10-16',
 '2026-10-10', 'devolvido'),

(3, 2, '2026-10-03 10:30:00',
 '2026-10-04', '2026-10-18',
 '2026-10-12', 'devolvido'),

(4, 3, '2026-10-05 14:00:00',
 '2026-10-06', '2026-10-20',
 '2026-10-15', 'devolvido'),

(5, 4, '2026-10-07 11:00:00',
 '2026-10-08', '2026-10-22',
 '2026-10-17', 'devolvido'),

(2, 5, '2026-10-11 15:00:00',
 '2026-10-12', '2026-10-26',
 '2026-10-18', 'devolvido');

-- 4. RESENHA
INSERT INTO resenha
(id_usuario, id_livro, texto, nota, data_publicacao)
VALUES
(2, 1,
 'Uma obra envolvente que nos faz questionar a confiabilidade do narrador.',
 5, '2026-10-11 10:00:00'),

(3, 2,
 'O livro apresenta uma crítica social interessante e personagens marcantes.',
 4, '2026-10-13 14:30:00'),

(4, 3,
 'Gostei muito da ironia e da maneira diferente como a história é contada.',
 5, '2026-10-16 09:00:00'),

(5, 4,
 'Uma leitura leve, com uma história romântica muito bonita.',
 4, '2026-10-18 16:00:00'),

(2, 5,
 'Uma narrativa curta, mas cheia de reflexões sobre a sociedade.',
 5, '2026-10-19 11:00:00');

-- 5. COMENTARIO
INSERT INTO comentario
(id_usuario, id_resenha, texto)
VALUES
(3, 1, 'Também gostei muito desse livro!'),
(4, 2, 'Achei a crítica social muito interessante.'),
(2, 3, 'Concordo! A ironia é uma das melhores partes.'),
(5, 1, 'Essa obra está na minha lista de próximas leituras.'),
(3, 5, 'Sua avaliação me deixou com vontade de ler!');

-- 6. CURTIDA
INSERT INTO curtida
(id_usuario, id_resenha)
VALUES
(3, 1),
(4, 1),
(5, 2),
(2, 3),
(3, 5);

-- 7. FAVORITO
INSERT INTO favorito
(id_usuario, id_livro)
VALUES
(2, 3),
(3, 1),
(4, 5),
(5, 2),
(2, 4);

-- 8. ESTANTE
INSERT INTO estante
(id_usuario, id_livro, categoria)
VALUES
(2, 1, 'ja_li'),
(2, 3, 'quero_ler'),
(3, 2, 'ja_li'),
(4, 5, 'lendo'),
(5, 1, 'quero_ler');

-- 9. UPLOAD DE ARQUIVOS
CREATE TABLE IF NOT EXISTS arquivo (
    id_arquivo SERIAL PRIMARY KEY,
    nome_original VARCHAR(255) NOT NULL,
    tipo_mime VARCHAR(100) NOT NULL,
    tamanho_bytes BIGINT NOT NULL,
    conteudo BYTEA NOT NULL,
    criado_em TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE usuario
ADD COLUMN IF NOT EXISTS id_foto_perfil INTEGER
REFERENCES arquivo(id_arquivo) ON DELETE SET NULL;
