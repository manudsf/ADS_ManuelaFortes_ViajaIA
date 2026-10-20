import { prisma } from "../db.js";
import { gerarTexto } from "./gemini.service.js";

async function buscarParticipanteConfirmado(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

export async function extrairPreferencias(participanteId) {
  const mensagens = await prisma.mensagemAgente.findMany({
    where: { participanteId },
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

  const texto = await gerarTexto({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  let dados;
  try {
    const textoLimpo = texto.replace(/```json|```/g, "").trim();
    dados = JSON.parse(textoLimpo);
  } catch (error) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  return {
    orcamento: dados.orcamento ?? null,
    interesses: Array.isArray(dados.interesses) ? dados.interesses.join(", ") : null,
    restricoes: dados.restricoes ?? null,
    resumoEstruturado: dados,
  };
}

export async function buscarPreferencia({ viagemId, usuarioId }) {
  const participante = await buscarParticipanteConfirmado(viagemId, usuarioId);

  return prisma.preferenciaViagem.findUnique({
    where: { participanteId: participante.id },
  });
}

export async function gerarPreferenciaDaConversa({ viagemId, usuarioId }) {
  const participante = await buscarParticipanteConfirmado(viagemId, usuarioId);
  const campos = await extrairPreferencias(participante.id);

  return prisma.preferenciaViagem.upsert({
    where: { participanteId: participante.id },
    create: { participanteId: participante.id, ...campos },
    update: campos,
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

export async function statusRespostas({ viagemId, usuarioId }) {
  const admin = await prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId, papel: "ADMIN" },
  });

  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }

  const participantes = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    include: { usuario: { select: { nome: true } } },
  });

  const lista = participantes.map((p) => ({
    participanteId: p.id,
    nome: p.usuario.nome,
    status: p.conversaConcluidaEm ? "CONCLUIDO" : "PENDENTE",
  }));

  const total = lista.length;
  const concluidos = lista.filter((p) => p.status === "CONCLUIDO").length;

  return {
    total,
    concluidos,
    pendentes: total - concluidos,
    todosConcluiram: total > 0 && concluidos === total,
    participantes: lista,
  };
}