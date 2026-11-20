# Livramente — Frontend

Interface web (SPA) do Livramente, feita em **React + Vite**. Consome a API REST do backend (pasta `../backend`).

## Tecnologias

- React 19 + Vite 6
- React Router DOM 6 (roteamento)
- SweetAlert2 (mensagens e confirmações)
- CSS próprio (identidade visual e responsividade)

## Como executar

Com o backend já em execução em `http://localhost:3000` (ver README principal):

```bash
npm install
npm run dev
```

Abra o endereço mostrado pelo Vite (por padrão `http://localhost:5173`).

### Configuração da API

A URL base da API vem de `VITE_API_URL`. Para customizar, crie um `.env` a partir do exemplo:

```bash
cp .env.example .env
```

```env
VITE_API_URL=http://localhost:3000
```

## Scripts

| Comando | Ação |
|---|---|
| `npm run dev` | Servidor de desenvolvimento (HMR) |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Pré-visualiza o build de produção |
| `npm run lint` | Verifica o código com ESLint |

## Estrutura

```
src/
├── api/          # client HTTP e serviços por recurso
├── components/   # componentes reutilizáveis (Navbar, Loader, Estrelas...)
├── context/      # AuthContext (sessão e JWT)
├── pages/        # telas (Home, Login, Cadastro, Perfil, Livro, Estante...)
├── styles/       # CSS global e identidade visual
└── utils/        # alertas (SweetAlert2)
```
