import { limparTextoIA } from "../utils/textoIA.js";
import { prisma } from "../db.js";
import { gerarTexto } from "./gemini.service.js";
import { extrairPreferencias } from "./preferencia.service.js";

const MENSAGEM_ENCERRAMENTO =
  "Perfeito! Registrei suas preferências e esta conversa está concluída. Se quiser ajustar algum detalhe, você ainda pode editar o seu resumo. Obrigado!";

function montarInstrucaoSistema(viagem) {
  const contextoTipo = {
    AMIGOS: "A viagem é entre amigos: privilegie vida noturna, experiências em grupo e atividades animadas.",
    CASAL: "A viagem é de casal: privilegie experiências a dois, passeios tranquilos e restaurantes românticos.",
    ROMANTICA: "A viagem é romântica: privilegie pôr do sol, jantares especiais, spa, hospedagens com vista e ambientes reservados.",
    ANIVERSARIO: "A viagem é para comemorar um aniversário: sugira experiências marcantes, jantares especiais e surpresas para a data.",
    DATA_ESPECIAL: "A viagem marca uma data especial: sugira experiências que combinem com a ocasião.",
    FAMILIA: "A viagem é em família: privilegie atividades para todas as idades, espaços seguros e ritmo sem pressa.",
  };

  const tom = viagem.tipoViagem
    ? `${contextoTipo[viagem.tipoViagem] ?? ""}${viagem.detalheTipo ? ` (${viagem.detalheTipo})` : ""}`
    : "";

  const base = `
Você é o agente de IA do ViajaIA, um assistente que coleta as preferências de viagem de cada participante de um grupo.
Converse de forma natural e simpática, em português do Brasil.
Faça perguntas de acompanhamento quando a resposta for vaga ou ambígua.
${tom}
Não invente respostas do usuário. Faça uma pergunta de cada vez, para não sobrecarregar a pessoa.
Escreva sempre em texto simples: não use asteriscos, negrito, títulos, listas com traços nem emojis.
Logo no início da conversa, se ainda não souber, pergunte o tipo de viagem: se é romântica, de casal, comemoração de aniversário de alguém do grupo, data especial ou entre amigos. Se for uma data especial, pergunte qual. Faça essa pergunta uma única vez, de forma natural.
`;

  if (viagem.destinoFinal) {
    return `${base}
O grupo já decidiu o destino desta viagem: ${viagem.destinoFinal.nomeDestino}.
Converse com o participante levando esse destino em conta: pergunte sobre orçamento disponível, datas possíveis e restrições (alimentares, de mobilidade etc.), sempre pensando em ${viagem.destinoFinal.nomeDestino} especificamente (ex: tipo de hospedagem, bairro, passeios típicos do lugar).
Não pergunte sobre outros destinos nem sobre interesses gerais de viagem — o destino já está definido.
`;
  }

  return `${base}
O grupo ainda não escolheu um destino. Pergunte sobre orçamento disponível, interesses (praia, cultura, aventura, gastronomia etc.) e datas possíveis — essas respostas serão usadas depois para sugerir destinos compatíveis para o grupo votar.
`;
}
async function buscarParticipante(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
    include: {
      viagem: {
        include: { destinoFinal: true },
      },
    },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

export async function listarMensagens({ viagemId, usuarioId }) {
  const participante = await buscarParticipante(viagemId, usuarioId);

  return prisma.mensagemAgente.findMany({
    where: { participanteId: participante.id },
    orderBy: { criadoEm: "asc" },
  });
}

export async function enviarMensagem({ viagemId, usuarioId, conteudo }) {
  const participante = await buscarParticipante(viagemId, usuarioId);

  if (participante.conversaConcluidaEm) {
    throw new Error("CONVERSA_ENCERRADA");
  }

  const historico = await prisma.mensagemAgente.findMany({
    where: { participanteId: participante.id },
    orderBy: { criadoEm: "asc" },
  });

  const contents = [
    ...historico.map((msg) => ({
      role: msg.remetente === "USUARIO" ? "user" : "model",
      parts: [{ text: msg.conteudo }],
    })),
    { role: "user", parts: [{ text: conteudo }] },
  ];

  const textoResposta = await gerarTexto({
    contents,
    systemInstruction: montarInstrucaoSistema(participante.viagem),
  });

  await prisma.mensagemAgente.create({
    data: {
      participanteId: participante.id,
      remetente: "USUARIO",
      conteudo,
    },
  });

  return prisma.mensagemAgente.create({
    data: {
      participanteId: participante.id,
      remetente: "AGENTE",
      conteudo: limparTextoIA(textoResposta),
    },
  });
}

export async function concluirConversa({ viagemId, usuarioId }) {
  const participante = await buscarParticipante(viagemId, usuarioId);

  if (participante.conversaConcluidaEm) {
    throw new Error("CONVERSA_ENCERRADA");
  }

  const campos = await extrairPreferencias(participante.id);

  const [preferencia, mensagemFinal] = await prisma.$transaction([
    prisma.preferenciaViagem.upsert({
      where: { participanteId: participante.id },
      create: { participanteId: participante.id, ...campos },
      update: campos,
    }),
    prisma.mensagemAgente.create({
      data: {
        participanteId: participante.id,
        remetente: "AGENTE",
        conteudo: MENSAGEM_ENCERRAMENTO,
      },
    }),
    prisma.participanteViagem.update({
      where: { id: participante.id },
      data: { conversaConcluidaEm: new Date() },
    }),
  ]);

  return { mensagemFinal, preferencia };
}