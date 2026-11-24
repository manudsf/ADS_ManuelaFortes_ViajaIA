# ViajaIA

Plataforma de planejamento colaborativo de viagens em grupo, com um agente de IA que conversa com cada participante, entende as preferências do grupo, sugere destinos, monta o roteiro e ajuda a dividir as despesas.

Projeto de Trabalho de Conclusão de Curso (TCC) do curso de Análise e Desenvolvimento de Sistemas, Universidade de Passo Fundo (UPF).

## Funcionalidades

- **Contas:** cadastro e login com e-mail e senha, login com Google e recuperação de senha por e-mail. Após 5 tentativas erradas, o login do e-mail fica bloqueado por 15 minutos.
- **Viagens e convites:** criação de viagens, convite de participantes por e-mail ou por link, com aceite ou recusa.
- **Agente de IA:** conversa individual com cada participante para levantar preferências (orçamento, ritmo, interesses, hospedagem).
- **Destinos e votação:** sugestões de destinos geradas pela IA e votação do grupo.
- **Roteiro:** roteiro dia a dia (manhã, tarde e noite) gerado pela IA, com ajustes, exportação em PDF e atalho para buscar voos no Google Flights.
- **Despesas:** registro de gastos, divisão igualitária entre os participantes, histórico de alterações, saldos e sugestão de acertos.

## Tecnologias

- **Frontend:** React, Vite, Tailwind CSS, React Router, Framer Motion, html2pdf.js e Google Identity Services.
- **Backend:** Node.js, Express, Prisma e PostgreSQL. Autenticação com JWT e bcrypt, validação de login Google com `google-auth-library` e envio de e-mails com Nodemailer.
- **IA:** Google Gemini (`@google/genai`).

## Estrutura do repositório

```
backend/    API REST (Express + Prisma)
  src/        rotas, controllers, services e utilitários
  prisma/     schema e migrations do banco
  tests/      testes automatizados (Vitest)
frontend/   interface web (React + Vite)
  src/        páginas, componentes, contexto e serviços de API
docs/       checklist de testes manuais
```

## Pré-requisitos

- Node.js (versão LTS)
- PostgreSQL em execução
- Chave de API do Google Gemini
- Client ID do Google (OAuth 2.0), para o login com Google

## Como rodar

### 1. Clonar o repositório

```bash
git clone https://github.com/manudsf/ADS_ManuelaFortes_ViajaIA.git
cd ADS_ManuelaFortes_ViajaIA
```

### 2. Configurar e subir o backend

```bash
cd backend
npm install
cp .env.example .env
```

Preencha o `backend/.env` (veja a tabela de variáveis abaixo). Depois, crie o banco e aplique as migrations:

```bash
npx prisma migrate dev
npx prisma generate
npm run dev
```

A API sobe em `http://localhost:3333`.

### 3. Configurar e subir o frontend

Em outro terminal:

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

A aplicação abre em `http://localhost:5173`.

> Atenção: o Vite lê o `frontend/.env` só ao iniciar. Depois de alterar essa variável, reinicie o `npm run dev`.

## Variáveis de ambiente

### `backend/.env`

| Variável | Descrição |
|----------|-----------|
| `DATABASE_URL` | Conexão com o PostgreSQL, ex.: `postgresql://usuario:senha@localhost:5432/viajaia` |
| `JWT_SECRET` | Chave longa e aleatória usada para assinar os tokens de sessão |
| `GEMINI_API_KEY` | Chave de API do Google Gemini |
| `GOOGLE_CLIENT_ID` | Client ID do Google. Deve ser o mesmo usado no frontend |
| `SMTP_HOST` / `SMTP_PORT` | Servidor SMTP para envio de e-mails (convites e recuperação de senha) |
| `EMAIL_FROM` | Remetente exibido nos e-mails |
| `APP_URL` | URL do frontend, usada nos links enviados por e-mail (padrão `http://localhost:5173`) |

### `frontend/.env`

| Variável | Descrição |
|----------|-----------|
| `VITE_API_URL` | URL da API (padrão `http://localhost:3333`) |
| `VITE_GOOGLE_CLIENT_ID` | Mesmo Client ID do backend. Sem ele, o botão de login com Google não aparece |

## Configurar o login com Google

1. No [Google Cloud Console](https://console.cloud.google.com/), crie um projeto e acesse **APIs e serviços → Credenciais**.
2. Clique em **Criar credenciais → ID do cliente OAuth**, com o tipo **Aplicativo da Web**.
3. Em **Origens JavaScript autorizadas**, adicione `http://localhost:5173`.
4. Copie o Client ID (termina em `.apps.googleusercontent.com`) e use nas duas variáveis: `GOOGLE_CLIENT_ID` no backend e `VITE_GOOGLE_CLIENT_ID` no frontend.

Atenção: use o Client ID, não o ID do projeto. O ID do projeto não funciona nessa variável.

## Testes

### Automatizados (backend)

```bash
cd backend
npm test
```

Cobrem a divisão de despesas, o cálculo de saldos e a interpretação da resposta do roteiro.

### Manuais

O roteiro de testes manuais, com passos e resultados esperados, está em [`docs/teste-manual.md`](docs/teste-manual.md).

## Scripts úteis

| Local | Comando | Função |
|-------|---------|--------|
| `backend` | `npm run dev` | Sobe a API com recarregamento automático |
| `backend` | `npm test` | Roda os testes automatizados |
| `frontend` | `npm run dev` | Sobe a interface em modo de desenvolvimento |
| `frontend` | `npm run build` | Gera a versão de produção em `frontend/dist` |
| `frontend` | `npm run lint` | Verifica o código com ESLint |
