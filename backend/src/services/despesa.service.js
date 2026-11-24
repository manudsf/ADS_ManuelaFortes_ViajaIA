import { prisma } from "../db.js";

const ARREDONDAR = (valor) => Math.round(valor * 100) / 100;

async function exigirParticipante(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

export function dividirIgualmente(valorTotal, participantesIds) {
  const cota = Math.floor((valorTotal / participantesIds.length) * 100) / 100;
  const restoCentavos = Math.round((valorTotal - cota * participantesIds.length) * 100);

  return participantesIds.map((usuarioId, i) => ({
    usuarioId,
    valorDevido: ARREDONDAR(cota + (i < restoCentavos ? 0.01 : 0)),
  }));
}

export async function listarDespesas({ viagemId, usuarioId }) {
  await exigirParticipante(viagemId, usuarioId);

  return prisma.despesa.findMany({
    where: { viagemId },
    orderBy: { criadoEm: "desc" },
    include: {
      pagoPor: { select: { id: true, nome: true } },
      participacoes: {
        include: { usuario: { select: { id: true, nome: true } } },
      },
    },
  });
}

export async function criarDespesa({ viagemId, usuarioId, descricao, valor, participantesIds }) {
  await exigirParticipante(viagemId, usuarioId);

  if (typeof valor !== "number" || !Number.isFinite(valor) || valor <= 0) {
    throw new Error("VALOR_INVALIDO");
  }

  const membros = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    select: { usuarioId: true },
  });
  const idsValidos = new Set(membros.map((m) => m.usuarioId));

  const quem = (participantesIds?.length ? participantesIds : membros.map((m) => m.usuarioId)).filter((id) =>
    idsValidos.has(id)
  );
  const unicos = [...new Set(quem)];

  if (unicos.length === 0) {
    throw new Error("SEM_PARTICIPANTES_NA_DESPESA");
  }

  const divisao = dividirIgualmente(valor, unicos);

  return prisma.$transaction(async (tx) => {
    const despesa = await tx.despesa.create({
      data: {
        viagemId,
        descricao,
        valor,
        pagoPorId: usuarioId,
        participacoes: { create: divisao },
      },
    });

    await tx.historicoDespesa.create({
      data: {
        despesaId: despesa.id,
        acao: "CRIADA",
        descricao: `Despesa "${descricao}" de R$ ${valor.toFixed(2)} registrada`,
        feitoPorId: usuarioId,
      },
    });

    return despesa;
  });
}

export async function editarDespesa({ viagemId, usuarioId, despesaId, descricao, valor, participantesIds }) {
  await exigirParticipante(viagemId, usuarioId);

  const despesa = await prisma.despesa.findFirst({ where: { id: despesaId, viagemId } });
  if (!despesa) {
    throw new Error("DESPESA_NAO_ENCONTRADA");
  }
  if (despesa.pagoPorId !== usuarioId) {
    throw new Error("SEM_PERMISSAO");
  }

  const novoValor = valor ?? despesa.valor;
  if (typeof novoValor !== "number" || !Number.isFinite(novoValor) || novoValor <= 0) {
    throw new Error("VALOR_INVALIDO");
  }

  const membros = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    select: { usuarioId: true },
  });
  const idsValidos = new Set(membros.map((m) => m.usuarioId));

  const atuais = await prisma.participacaoDespesa.findMany({
    where: { despesaId },
    select: { usuarioId: true },
  });
  const baseIds = participantesIds ?? atuais.map((a) => a.usuarioId);
  const unicos = [...new Set(baseIds)].filter((id) => idsValidos.has(id));

  if (unicos.length === 0) {
    throw new Error("SEM_PARTICIPANTES_NA_DESPESA");
  }

  const divisao = dividirIgualmente(novoValor, unicos);
  const novaDescricao = descricao ?? despesa.descricao;

  return prisma.$transaction(async (tx) => {
    await tx.participacaoDespesa.deleteMany({ where: { despesaId } });

    const atualizada = await tx.despesa.update({
      where: { id: despesaId },
      data: {
        descricao: novaDescricao,
        valor: novoValor,
        participacoes: { create: divisao },
      },
    });

    await tx.historicoDespesa.create({
      data: {
        despesaId,
        acao: "EDITADA",
        descricao: `Alterada: "${novaDescricao}", R$ ${novoValor.toFixed(2)}`,
        feitoPorId: usuarioId,
      },
    });

    return atualizada;
  });
}

export async function excluirDespesa({ viagemId, usuarioId, despesaId }) {
  await exigirParticipante(viagemId, usuarioId);

  const despesa = await prisma.despesa.findFirst({ where: { id: despesaId, viagemId } });
  if (!despesa) {
    throw new Error("DESPESA_NAO_ENCONTRADA");
  }
  if (despesa.pagoPorId !== usuarioId) {
    throw new Error("SEM_PERMISSAO");
  }

  await prisma.$transaction(async (tx) => {
    await tx.historicoDespesa.create({
      data: {
        despesaId,
        acao: "EXCLUIDA",
        descricao: `Despesa "${despesa.descricao}" excluída`,
        feitoPorId: usuarioId,
      },
    });
    await tx.participacaoDespesa.deleteMany({ where: { despesaId } });
    await tx.despesa.delete({ where: { id: despesaId } });
  });
}

export async function calcularSaldos({ viagemId, usuarioId }) {
  await exigirParticipante(viagemId, usuarioId);

  const membros = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    include: { usuario: { select: { id: true, nome: true } } },
  });

  const despesas = await prisma.despesa.findMany({
    where: { viagemId },
    include: { participacoes: true },
  });

  const saldo = new Map(membros.map((m) => [m.usuarioId, { id: m.usuarioId, nome: m.usuario.nome, valor: 0 }]));

  for (const d of despesas) {
    if (saldo.has(d.pagoPorId)) {
      saldo.get(d.pagoPorId).valor += d.valor;
    }
    for (const p of d.participacoes) {
      if (saldo.has(p.usuarioId)) {
        saldo.get(p.usuarioId).valor -= p.valorDevido;
      }
    }
  }

  const pessoas = [...saldo.values()].map((p) => ({ ...p, valor: ARREDONDAR(p.valor) }));

  const credores = pessoas.filter((p) => p.valor > 0.009).map((p) => ({ ...p }));
  const devedores = pessoas.filter((p) => p.valor < -0.009).map((p) => ({ ...p, valor: -p.valor }));

  const transferencias = [];
  let i = 0;
  let j = 0;

  while (i < devedores.length && j < credores.length) {
    const valor = ARREDONDAR(Math.min(devedores[i].valor, credores[j].valor));

    if (valor > 0) {
      transferencias.push({
        de: { id: devedores[i].id, nome: devedores[i].nome },
        para: { id: credores[j].id, nome: credores[j].nome },
        valor,
      });
    }

    devedores[i].valor = ARREDONDAR(devedores[i].valor - valor);
    credores[j].valor = ARREDONDAR(credores[j].valor - valor);

    if (devedores[i].valor <= 0.009) i++;
    if (credores[j].valor <= 0.009) j++;
  }

  return {
    totalGasto: ARREDONDAR(despesas.reduce((soma, d) => soma + d.valor, 0)),
    saldos: pessoas,
    transferencias,
  };
}

export async function listarHistorico({ viagemId, usuarioId, despesaId }) {
  await exigirParticipante(viagemId, usuarioId);

  const despesa = await prisma.despesa.findFirst({ where: { id: despesaId, viagemId } });
  if (!despesa) {
    throw new Error("DESPESA_NAO_ENCONTRADA");
  }

  return prisma.historicoDespesa.findMany({
    where: { despesaId },
    orderBy: { criadoEm: "asc" },
  });
}