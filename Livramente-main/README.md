# 📚 Livramente — Sistema de Gerenciamento de Biblioteca

> Sistema web de gerenciamento de biblioteca que integra o controle de empréstimos de livros a funcionalidades sociais entre leitores (resenhas, avaliações, comentários, curtidas, estantes e favoritos).

## 📌 Sobre o projeto

O **Livramente** facilita o gerenciamento do acervo de uma biblioteca e proporciona uma experiência de leitura mais interativa. Inspirado em plataformas como o Skoob, reúne funcionalidades administrativas e sociais em uma única aplicação.

Os usuários podem consultar livros, solicitar empréstimos, publicar resenhas, avaliar obras, comentar e curtir avaliações de outros leitores, além de organizar suas leituras em estantes virtuais e listas de favoritos. Administradores gerenciam o acervo e aprovam/registram a devolução dos empréstimos.

Projeto desenvolvido para fins acadêmicos, na disciplina de **Desenvolvimento Web**.

## 🧩 Arquitetura

O projeto é dividido em duas aplicações independentes:

| Aplicação | Pasta | Tecnologia | Porta padrão |
|---|---|---|---|
| **Backend** (API REST) | `backend/` | Node.js + Express + PostgreSQL | `3000` |
| **Frontend** (SPA) | `frontend/` | React + Vite | `5173` |

O backend expõe a API e também serve, na rota raiz (`GET /`), uma página de **documentação completa de todos os endpoints**. O frontend é uma Single Page Application em React que consome essa API.

## 🛠️ Tecnologias utilizadas

**Backend**
- **Node.js** + **Express 5** — servidor e roteamento da API
- **PostgreSQL 18** — banco de dados relacional
- **pg** — driver de acesso ao PostgreSQL
- **bcrypt** — geração do hash das senhas
- **jsonwebtoken (JWT)** — autenticação baseada em token
- **multer** — upload de imagens (fotos de perfil e capas), armazenadas no banco em `BYTEA`
- **cors** — liberação de acesso para o frontend
- **Docker / Docker Compose** — orquestração de ambiente (API + banco + interface de administração)

**Frontend**
- **React 19** — construção da interface
- **Vite 6** — bundler e servidor de desenvolvimento
- **React Router DOM 6** — roteamento de páginas
- **SweetAlert2** — mensagens de sucesso, erro e confirmação ("aqueles avisos bonitos")
- **CSS próprio** — identidade visual e responsividade (sem framework de UI)

## ✅ Funcionalidades

- **Usuários e autenticação:** cadastro público (inclusive com foto de perfil, sem exigir login prévio), login com JWT, edição de perfil e foto, exclusão da própria conta.
- **Livros:** listagem, busca, detalhes, cadastro/edição/exclusão (administrador), upload e exibição de capas.
- **Estantes:** organização dos livros em `Quero ler`, `Lendo` e `Já li`.
- **Favoritos:** marcar e desmarcar livros favoritos.
- **Empréstimos:** solicitação pelo leitor; aprovação, recusa e registro de devolução pelo administrador; controle de exemplares disponíveis.
- **Resenhas, comentários e curtidas:** publicar/editar/excluir resenhas com nota (1–5), comentar e curtir resenhas de outros leitores.
- **Área administrativa:** painel com livros, usuários e empréstimos pendentes, além da limpeza de imagens órfãs.
- **Exclusão lógica (soft delete):** nenhum registro das entidades principais é apagado fisicamente — ver seção abaixo.

## 🗑️ Exclusão lógica (soft delete)

As entidades principais possuem a coluna booleana `removido`. As rotas de exclusão (`DELETE`) **não apagam** o registro: apenas marcam `removido = TRUE`, e **todas as consultas ignoram os registros removidos**. Isso preserva o histórico e a integridade referencial.

| Entidade | Possui `removido`? |
|---|---|
| `usuario`, `livro`, `emprestimo` | Sim |
| `resenha`, `comentario`, `curtida` | Sim |
| `favorito`, `estante` | Sim |
| `arquivo` | Não (é removido fisicamente quando fica órfão) |

Os índices únicos (e-mail, ISBN, resenha por livro/usuário) valem apenas entre os registros ativos, permitindo reaproveitar valores de itens removidos. Em `curtida`, `favorito` e `estante`, readicionar um item antes removido o reativa automaticamente.

---

## 🚀 Como executar o projeto

### Pré-requisitos

- [Docker](https://www.docker.com/) e Docker Compose (para o backend e o banco)
- [Node.js 20+](https://nodejs.org/) e npm (para o frontend)

> **Atenção:** os comandos Docker devem ser executados dentro da pasta que contém o arquivo `docker-compose.yml` (a pasta `Livramente`).

### 1️⃣ Backend + Banco de dados (Docker)

Na pasta principal do projeto, suba a API, o banco e a interface de administração (pgweb):

```bash
docker compose up -d
```

Isso inicia três serviços:

| Serviço | Descrição | Endereço |
|---|---|---|
| `node` | API REST do Livramente | http://localhost:3000 |
| `database` | PostgreSQL 18 | porta `5432` |
| `pgweb` | Interface web para o banco | http://localhost:8081 |

Na primeira execução o Docker pode precisar baixar as imagens, o que leva algum tempo.

Para verificar se a API está no ar, acesse **http://localhost:3000** — a documentação completa dos endpoints será exibida.

> Caso queira subir **apenas** o banco e a interface (como na primeira entrega), use:
> ```bash
> docker compose up -d database pgweb
> ```

#### Inicialização automática do banco

Ao iniciar o PostgreSQL com um diretório de dados vazio, o Docker executa automaticamente o `backend/init.sql`, que cria as tabelas, chaves, restrições, relacionamentos e insere os dados fictícios de teste.

> A inicialização automática só ocorre quando o PostgreSQL cria um diretório de dados novo. Se o banco já foi inicializado antes, o script não roda de novo automaticamente — ver "Reinicializando o banco do zero".

### 2️⃣ Frontend (React + Vite)

Em **outro terminal**, entre na pasta do frontend, instale as dependências e inicie o servidor de desenvolvimento:

```bash
cd frontend
npm install
npm run dev
```

O Vite exibirá o endereço local (por padrão **http://localhost:5173**). Abra-o no navegador.

#### Configuração da URL da API

O frontend lê a URL base da API da variável `VITE_API_URL`. Se o backend estiver em `http://localhost:3000` (padrão), nada precisa ser feito. Para customizar, copie o arquivo de exemplo e ajuste:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

### 3️⃣ Credenciais de teste

Os dados fictícios do `init.sql` já incluem usuários para teste. Todos usam a senha **`123456`**.

| Usuário | E-mail | Perfil |
|---|---|---|
| Ana Fargoni | `ana.fargoni@gmail.com` | **Administradora** |
| Grazi Tonelli | `gra.tonelli@gmail.com` | Comum |
| Sophia Silva | `sophia.silva@gmail.com` | Comum |

Entre com a conta da Ana para acessar a área administrativa (cadastro de livros, aprovação de empréstimos etc.).

---

## 🗄️ Banco de dados

O sistema utiliza **PostgreSQL**. A modelagem considera integridade referencial, consistência dos dados e as regras de negócio da biblioteca. O banco é composto por oito tabelas principais, mais a tabela `arquivo` (upload de imagens):

| Tabela | Finalidade |
|---|---|
| `usuario` | Usuários comuns e administradores |
| `livro` | Informações dos livros do acervo |
| `emprestimo` | Solicitações, aprovações e devoluções |
| `resenha` | Avaliações e opiniões sobre os livros |
| `comentario` | Comentários nas resenhas |
| `curtida` | Curtidas de usuários em resenhas |
| `favorito` | Livros favoritos de cada usuário |
| `estante` | Leituras do usuário organizadas por categoria |
| `arquivo` | Imagens (fotos de perfil e capas), armazenadas em `BYTEA` |

As tabelas `curtida`, `favorito` e `estante` representam relacionamentos muitos-para-muitos com chaves primárias compostas.

### Acessando o banco pelo pgweb

Com os serviços no ar, acesse **http://localhost:8081** para inspecionar as tabelas e os dados. As credenciais são apenas de ambiente acadêmico de desenvolvimento e devem ser substituídas antes de qualquer disponibilização pública.

### Encerrando os serviços

```bash
docker compose down
```

Os contêineres são interrompidos, mas os dados persistidos no volume são preservados.

### Reinicializando o banco do zero

Para recriar o banco e executar o `init.sql` novamente:

```bash
docker compose down -v
docker compose up -d
```

**⚠️ Atenção:** o parâmetro `-v` remove os volumes, **apagando os dados persistidos**. Use somente quando a exclusão for intencional.

---

## 📡 Documentação da API

A documentação completa de **todos os endpoints** — métodos, parâmetros, corpo da requisição, respostas, restrições de autenticação e autorização — está disponível na rota raiz do backend:

👉 **http://localhost:3000**

### Autenticação

O login (`POST /autenticacao/login`) devolve um **token JWT** (válido por 2 horas). Nas rotas protegidas, envie o cabeçalho:

```
Authorization: Bearer <token>
```

Sem token ou com token expirado a resposta é `401`; rotas exclusivas de administrador respondem `403` para usuários comuns.

### Resumo dos grupos de rotas

| Prefixo | Responsabilidade |
|---|---|
| `/autenticacao` | Login e dados do usuário logado |
| `/usuario` | Cadastro, consulta, edição e exclusão de usuários |
| `/livro` | Acervo de livros (CRUD; escrita só para admin) |
| `/estante` | Estantes do usuário (`quero_ler`, `lendo`, `ja_li`) |
| `/favorito` | Favoritos do usuário |
| `/emprestimo` | Solicitação e gestão de empréstimos |
| `/resenha` | Resenhas e avaliações |
| `/comentario` | Comentários em resenhas |
| `/curtida` | Curtidas em resenhas |
| `/arquivos` | Upload e exibição de imagens |

---

## 👥 Autores

Projeto desenvolvido para a disciplina de Desenvolvimento Web.

**Integrantes do grupo G:**

- **Grazielly Tonelli** — Usuários, autenticação e frontend de usuários
- **Sophia Silva** — Livros, estantes, favoritos e arquivos
- **Ana Fargoni** — Empréstimos, interações (resenhas, comentários, curtidas) e documentação
