import { prisma } from "../db.js";
import { gerarTexto } from "./gemini.service.js";

const QTD_DESTINOS = 3;

async function buscarParticipanteConfirmado(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

async function exigirAdmin(viagemId, usuarioId) {
  const admin = await prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId, papel: "ADMIN" },
  });

  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }
}

async function buscarViagem(viagemId) {
  const viagem = await prisma.viagem.findUnique({ where: { id: viagemId } });

  if (!viagem) {
    throw new Error("VIAGEM_NAO_ENCONTRADA");
  }

  return viagem;
}

async function montarResultado(viagemId, usuarioId) {
  const viagem = await buscarViagem(viagemId);

  const [destinos, totalParticipantes, totalVotos, meuVoto] = await Promise.all([
    prisma.destinoSugerido.findMany({
      where: { viagemId },
      include: { _count: { select: { votos: true } } },
    }),
    prisma.participanteViagem.count({ where: { viagemId, statusConvite: "ACEITO" } }),
    prisma.votoDestino.count({ where: { destino: { viagemId } } }),
    prisma.votoDestino.findFirst({ where: { usuarioId, destino: { viagemId } } }),
  ]);

  return {
    votacaoEncerrada: Boolean(viagem.destinoFinalId),
    destinoFinalId: viagem.destinoFinalId,
    totalParticipantes,
    totalVotos,
    meuVotoDestinoId: meuVoto?.destinoId ?? null,
    destinos: destinos
      .map((d) => ({
        id: d.id,
        nomeDestino: d.nomeDestino,
        descricao: d.descricao,
        geradoPorIa: d.geradoPorIa,
        votos: d._count.votos,
      }))
      .sort((a, b) => b.votos - a.votos || a.nomeDestino.localeCompare(b.nomeDestino)),
  };
}

async function apurar(viagemId) {
  const destinos = await prisma.destinoSugerido.findMany({
    where: { viagemId },
    include: { _count: { select: { votos: true } } },
  });

  const maximo = Math.max(0, ...destinos.map((d) => d._count.votos));
  const lideres = destinos.filter((d) => d._count.votos === maximo);

  return { maximo, lideres };
}

async function confirmarDestino(viagemId, destinoId) {
  return prisma.viagem.update({
    where: { id: viagemId },
    data: { destinoFinalId: destinoId, status: "DESTINO_DEFINIDO" },
  });
}

async function tentarEncerrarAutomaticamente(viagemId) {
  const [totalParticipantes, totalVotos] = await Promise.all([
    prisma.participanteViagem.count({ where: { viagemId, statusConvite: "ACEITO" } }),
    prisma.votoDestino.count({ where: { destino: { viagemId } } }),
  ]);

  if (totalVotos < totalParticipantes) {
    return { empate: false };
  }

  const { lideres } = await apurar(viagemId);

  if (lideres.length === 1) {
    await confirmarDestino(viagemId, lideres[0].id);
    return { empate: false };
  }

  return { empate: true };
}

function interpretarSugestoes(texto) {
  let lista;
  try {
    lista = JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch (error) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  if (!Array.isArray(lista)) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const sugestoes = lista
    .filter((item) => item && typeof item.nomeDestino === "string" && item.nomeDestino.trim())
    .slice(0, QTD_DESTINOS)
    .map((item) => ({
      nomeDestino: item.nomeDestino.trim(),
      descricao: typeof item.descricao === "string" ? item.descricao.trim() : null,
    }));

  if (sugestoes.length === 0) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  return sugestoes;
}

export async function sugerirDestinos({ viagemId, usuarioId }) {
  await exigirAdmin(viagemId, usuarioId);
  const viagem = await buscarViagem(viagemId);

  if (viagem.destinoFinalId) {
    throw new Error("DESTINO_JA_DEFINIDO");
  }

  const participantes = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    include: { preferencia: true },
  });

  const pendentes = participantes.filter((p) => !p.conversaConcluidaEm).length;
  if (pendentes > 0) {
    const erro = new Error("CONVERSAS_PENDENTES");
    erro.pendentes = pendentes;
    throw erro;
  }

  const totalVotos = await prisma.votoDestino.count({ where: { destino: { viagemId } } });
  if (totalVotos > 0) {
    throw new Error("VOTACAO_EM_ANDAMENTO");
  }

  const perfis = participantes
    .map((p, i) => {
      const pref = p.preferencia;
      return `Participante ${i + 1}: orçamento ${pref?.orcamento ?? "não informado"}; interesses: ${pref?.interesses ?? "não informados"}; restrições: ${pref?.restricoes ?? "nenhuma informada"}`;
    })
    .join("\n");

  const orcamentos = participantes
    .map((p) => p.preferencia?.orcamento)
    .filter((valor) => typeof valor === "number");
  const menorOrcamento = orcamentos.length > 0 ? Math.min(...orcamentos) : null;

  const datas =
    viagem.dataInicio && viagem.dataFim
      ? `${viagem.dataInicio.toISOString().slice(0, 10)} a ${viagem.dataFim.toISOString().slice(0, 10)}`
      : "não definidas";

  const prompt = `
Você é o agente de IA do ViajaIA. Com base nas preferências anônimas dos participantes de um grupo de viagem, sugira exatamente ${QTD_DESTINOS} destinos compatíveis com o grupo como um todo.

Regras:
- Respeite o MENOR orçamento informado, para que todos consigam pagar (se houver).
- Considere as restrições de todos.
- Procure equilibrar os interesses do grupo.
- Na descrição (2 a 3 frases), explique por que o destino combina com o grupo, SEM citar participantes específicos e SEM atribuir preferências a pessoas.
- Os destinos devem ser diferentes entre si.

Responda APENAS com um JSON válido, sem markdown e sem texto adicional, no formato:
[
  { "nomeDestino": "string", "descricao": "string" }
]

Nome da viagem: ${viagem.nome}
Datas: ${datas}
Menor orçamento informado: ${menorOrcamento ?? "não informado"}
Preferências do grupo:
${perfis}
`;

  const texto = await gerarTexto({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const sugestoes = interpretarSugestoes(texto);

  await prisma.$transaction([
    prisma.destinoSugerido.deleteMany({ where: { viagemId, geradoPorIa: true } }),
    prisma.destinoSugerido.createMany({
      data: sugestoes.map((s) => ({
        viagemId,
        nomeDestino: s.nomeDestino,
        descricao: s.descricao,
        geradoPorIa: true,
      })),
    }),
  ]);

  return montarResultado(viagemId, usuarioId);
}

export async function listarDestinos({ viagemId, usuarioId }) {
  await buscarParticipanteConfirmado(viagemId, usuarioId);
  return montarResultado(viagemId, usuarioId);
}

export async function votar({ viagemId, usuarioId, destinoId }) {
  await buscarParticipanteConfirmado(viagemId, usuarioId);
  const viagem = await buscarViagem(viagemId);

  if (viagem.destinoFinalId) {
    throw new Error("VOTACAO_ENCERRADA");
  }

  const destino = await prisma.destinoSugerido.findFirst({
    where: { id: destinoId, viagemId },
  });
  if (!destino) {
    throw new Error("DESTINO_NAO_ENCONTRADO");
  }

  const jaVotou = await prisma.votoDestino.findFirst({
    where: { usuarioId, destino: { viagemId } },
  });
  if (jaVotou) {
    throw new Error("JA_VOTOU");
  }

  await prisma.votoDestino.create({ data: { destinoId, usuarioId } });

  const { empate } = await tentarEncerrarAutomaticamente(viagemId);
  const resultado = await montarResultado(viagemId, usuarioId);

  return { ...resultado, empate };
}

export async function encerrarVotacao({ viagemId, usuarioId, destinoId }) {
  await exigirAdmin(viagemId, usuarioId);
  const viagem = await buscarViagem(viagemId);

  if (viagem.destinoFinalId) {
    throw new Error("VOTACAO_ENCERRADA");
  }

  const { maximo, lideres } = await apurar(viagemId);

  if (lideres.length === 0) {
    throw new Error("SEM_DESTINOS");
  }

  let escolhido;

  if (destinoId) {
    escolhido = lideres.find((d) => d.id === destinoId);
    if (!escolhido) {
      throw new Error("DESTINO_FORA_DO_EMPATE");
    }
  } else if (lideres.length === 1 && maximo > 0) {
    escolhido = lideres[0];
  } else {
    const erro = new Error("EMPATE");
    erro.empatados = lideres.map((d) => ({
      id: d.id,
      nomeDestino: d.nomeDestino,
      votos: d._count.votos,
    }));
    throw erro;
  }

  await confirmarDestino(viagemId, escolhido.id);
  return montarResultado(viagemId, usuarioId);
}