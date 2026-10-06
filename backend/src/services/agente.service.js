import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db.js";

const ai = new GoogleGenAI({});
const MODELO = "gemini-3-flash-preview";

const INSTRUCAO_SISTEMA = `
Você é o agente de IA do ViajaIA, um assistente que coleta as preferências de viagem de cada participante de um grupo.
Converse de forma natural e simpática, em português do Brasil.
Seu objetivo é descobrir: orçamento disponível, interesses (praia, cultura, aventura, gastronomia etc.), datas possíveis e restrições (alimentares, de mobilidade etc.).
Faça perguntas de acompanhamento quando a resposta for vaga ou ambígua.
Não invente respostas do usuário. Faça uma pergunta de cada vez, para não sobrecarregar a pessoa.
`;

async function buscarParticipante(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
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

  await prisma.mensagemAgente.create({
    data: {
      participanteId: participante.id,
      remetente: "USUARIO",
      conteudo,
    },
  });

  const historico = await prisma.mensagemAgente.findMany({
    where: { participanteId: participante.id },
    orderBy: { criadoEm: "asc" },
  });

  const contents = historico.map((msg) => ({
    role: msg.remetente === "USUARIO" ? "user" : "model",
    parts: [{ text: msg.conteudo }],
  }));

  const resposta = await ai.models.generateContent({
    model: MODELO,
    contents,
    config: { systemInstruction: INSTRUCAO_SISTEMA },
  });

  const mensagemAgente = await prisma.mensagemAgente.create({
    data: {
      participanteId: participante.id,
      remetente: "AGENTE",
      conteudo: resposta.text,
    },
  });

  return mensagemAgente;
}