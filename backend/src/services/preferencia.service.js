import { GoogleGenAI } from "@google/genai";
import { prisma } from "../db.js";

const ai = new GoogleGenAI({});
const MODELO = "gemini-3-flash-preview";

async function buscarParticipanteConfirmado(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

export async function buscarPreferencia({ viagemId, usuarioId }) {
  const participante = await buscarParticipanteConfirmado(viagemId, usuarioId);

  return prisma.preferenciaViagem.findUnique({
    where: { participanteId: participante.id },
  });
}

export async function gerarPreferenciaDaConversa({ viagemId, usuarioId }) {
  const participante = await buscarParticipanteConfirmado(viagemId, usuarioId);

  const mensagens = await prisma.mensagemAgente.findMany({
    where: { participanteId: participante.id },
    orderBy: { criadoEm: "asc" },
  });

  if (mensagens.length === 0) {
    throw new Error("SEM_CONVERSA");
  }

  const conversaTexto = mensagens
    .map((m) => `${m.remetente === "USUARIO" ? "Participante" : "Agente"}: ${m.conteudo}`)
    .join("\n");

  const prompt = `
Leia a conversa abaixo entre um participante de uma viagem e o agente de IA do ViajaIA.
Extraia as preferências mencionadas e responda APENAS com um JSON válido, sem markdown, sem texto adicional, no formato:

{
  "orcamento": number ou null,
  "interesses": ["string", "string"],
  "restricoes": "string ou null"
}

Se alguma informação não foi mencionada na conversa, use null (ou array vazio para interesses).

Conversa:
${conversaTexto}
`;

  const resposta = await ai.models.generateContent({
    model: MODELO,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let dados;
  try {
    const textoLimpo = resposta.text.replace(/```json|```/g, "").trim();
    dados = JSON.parse(textoLimpo);
  } catch (error) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const interessesTexto = Array.isArray(dados.interesses) ? dados.interesses.join(", ") : null;

  return prisma.preferenciaViagem.upsert({
    where: { participanteId: participante.id },
    create: {
      participanteId: participante.id,
      orcamento: dados.orcamento ?? null,
      interesses: interessesTexto,
      restricoes: dados.restricoes ?? null,
      resumoEstruturado: dados,
    },
    update: {
      orcamento: dados.orcamento ?? null,
      interesses: interessesTexto,
      restricoes: dados.restricoes ?? null,
      resumoEstruturado: dados,
    },
  });
}

export async function editarPreferencia({ viagemId, usuarioId, orcamento, interesses, restricoes }) {
  const participante = await buscarParticipanteConfirmado(viagemId, usuarioId);

  return prisma.preferenciaViagem.upsert({
    where: { participanteId: participante.id },
    create: {
      participanteId: participante.id,
      orcamento: orcamento ?? null,
      interesses: interesses ?? null,
      restricoes: restricoes ?? null,
    },
    update: {
      ...(orcamento !== undefined && { orcamento }),
      ...(interesses !== undefined && { interesses }),
      ...(restricoes !== undefined && { restricoes }),
    },
  });
}