const BASE_URL = import.meta.env.VITE_API_URL ?? "http://localhost:3333";
const CHAVE_TOKEN = "viajaia_token";
const CHAVE_USUARIO = "viajaia_usuario";

export function salvarSessao(token, usuario) {
  localStorage.setItem(CHAVE_TOKEN, token);
  localStorage.setItem(CHAVE_USUARIO, JSON.stringify(usuario));
}

export function limparSessao() {
  localStorage.removeItem(CHAVE_TOKEN);
  localStorage.removeItem(CHAVE_USUARIO);
}

export function lerUsuarioSalvo() {
  return JSON.parse(localStorage.getItem(CHAVE_USUARIO) || "null");
}

async function requisicao(caminho, { metodo = "GET", corpo } = {}) {
  const headers = { "Content-Type": "application/json" };
  const token = localStorage.getItem(CHAVE_TOKEN);
  if (token) headers.Authorization = `Bearer ${token}`;

  const resposta = await fetch(`${BASE_URL}${caminho}`, {
    method: metodo,
    headers,
    body: corpo ? JSON.stringify(corpo) : undefined,
  });

  if (resposta.status === 204) return null;

  const dados = await resposta.json().catch(() => ({}));
  if (!resposta.ok) {
    const erro = new Error(dados.erro ?? "Algo deu errado. Tente novamente.");
    erro.status = resposta.status;
    throw erro;
  }
  return dados;
}

export const api = {
  // Autenticação
  cadastro: (dados) => requisicao("/auth/cadastro", { metodo: "POST", corpo: dados }),
  login: (dados) => requisicao("/auth/login", { metodo: "POST", corpo: dados }),
  esqueciSenha: (email) => requisicao("/auth/esqueci-senha", { metodo: "POST", corpo: { email } }),
  redefinirSenha: (token, novaSenha) =>
    requisicao("/auth/redefinir-senha", { metodo: "POST", corpo: { token, novaSenha } }),

  // Viagens
  listarViagens: () => requisicao("/viagens"),
  criarViagem: (dados) => requisicao("/viagens", { metodo: "POST", corpo: dados }),
  buscarViagem: (id) => requisicao(`/viagens/${id}`),
  excluirViagem: (id) => requisicao(`/viagens/${id}`, { metodo: "DELETE" }),

  // Participantes
  convidar: (viagemId, email) =>
    requisicao(`/viagens/${viagemId}/participantes`, { metodo: "POST", corpo: { email } }),
  confirmarConvite: (viagemId) =>
    requisicao(`/viagens/${viagemId}/participantes/confirmar`, { metodo: "PATCH" }),
  recusarConvite: (viagemId) =>
    requisicao(`/viagens/${viagemId}/participantes/recusar`, { metodo: "PATCH" }),
  removerParticipante: (viagemId, participanteId) =>
    requisicao(`/viagens/${viagemId}/participantes/${participanteId}`, { metodo: "DELETE" }),

  // Convite por link
  gerarLinkConvite: (viagemId) => requisicao(`/convites/viagem/${viagemId}`, { metodo: "POST" }),
  revogarLinkConvite: (viagemId) => requisicao(`/convites/viagem/${viagemId}`, { metodo: "DELETE" }),
  buscarConvite: (token) => requisicao(`/convites/${token}`),
  aceitarConvite: (token) => requisicao(`/convites/${token}/aceitar`, { metodo: "POST" }),

  // Chat com o agente
  listarMensagens: (viagemId) => requisicao(`/viagens/${viagemId}/mensagens`),
  enviarMensagem: (viagemId, conteudo) =>
    requisicao(`/viagens/${viagemId}/mensagens`, { metodo: "POST", corpo: { conteudo } }),
  concluirConversa: (viagemId) =>
    requisicao(`/viagens/${viagemId}/mensagens/concluir`, { metodo: "POST" }),

  // Preferências
  buscarPreferencias: (viagemId) => requisicao(`/viagens/${viagemId}/preferencias`),
  gerarPreferencias: (viagemId) =>
    requisicao(`/viagens/${viagemId}/preferencias/gerar`, { metodo: "POST" }),
  editarPreferencias: (viagemId, dados) =>
    requisicao(`/viagens/${viagemId}/preferencias`, { metodo: "PATCH", corpo: dados }),
  statusRespostas: (viagemId) => requisicao(`/viagens/${viagemId}/preferencias/status`),

  // Destinos e votação
  listarDestinos: (viagemId) => requisicao(`/viagens/${viagemId}/destinos`),
  sugerirDestinos: (viagemId) => requisicao(`/viagens/${viagemId}/destinos/sugerir`, { metodo: "POST" }),
  votar: (viagemId, destinoId) =>
    requisicao(`/viagens/${viagemId}/destinos/${destinoId}/votar`, { metodo: "POST" }),
  encerrarVotacao: (viagemId, destinoId) =>
    requisicao(`/viagens/${viagemId}/destinos/encerrar-votacao`, {
      metodo: "POST",
      corpo: destinoId ? { destinoId } : undefined,
    }),

  // Roteiro
  buscarRoteiro: (viagemId) => requisicao(`/viagens/${viagemId}/roteiro`),
  gerarRoteiro: (viagemId, corpo) =>
    requisicao(`/viagens/${viagemId}/roteiro/gerar`, { metodo: "POST", corpo }),

  // Despesas
  listarDespesas: (viagemId) => requisicao(`/viagens/${viagemId}/despesas`),
  criarDespesa: (viagemId, dados) =>
    requisicao(`/viagens/${viagemId}/despesas`, { metodo: "POST", corpo: dados }),
  editarDespesa: (viagemId, despesaId, dados) =>
    requisicao(`/viagens/${viagemId}/despesas/${despesaId}`, { metodo: "PATCH", corpo: dados }),
  excluirDespesa: (viagemId, despesaId) =>
    requisicao(`/viagens/${viagemId}/despesas/${despesaId}`, { metodo: "DELETE" }),
  calcularSaldos: (viagemId) => requisicao(`/viagens/${viagemId}/despesas/saldos`),
  historicoDespesa: (viagemId, despesaId) =>
    requisicao(`/viagens/${viagemId}/despesas/${despesaId}/historico`),

  // Perfil
  buscarPerfil: () => requisicao("/perfil"),
  atualizarPerfil: (dados) => requisicao("/perfil", { metodo: "PATCH", corpo: dados }),
  trocarSenha: (dados) => requisicao("/perfil/senha", { metodo: "PATCH", corpo: dados }),

    definirTipoViagem: (viagemId, tipo, detalhe) =>
    requisicao(`/viagens/${viagemId}/tipo`, { metodo: "PATCH", corpo: { tipo, detalhe } }),
};