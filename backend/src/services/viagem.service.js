import { prisma } from "../db.js";

export async function criarViagem({ nome, dataInicio, dataFim, destino, criadoPorId }) {
  return prisma.$transaction(async (tx) => {
    const viagem = await tx.viagem.create({
      data: {
        nome,
        dataInicio: dataInicio ? new Date(dataInicio) : null,
        dataFim: dataFim ? new Date(dataFim) : null,
        criadoPorId,
        status: destino ? "DESTINO_DEFINIDO" : "PLANEJAMENTO",
        participantes: {
          create: {
            usuarioId: criadoPorId,
            papel: "ADMIN",
            statusConvite: "ACEITO",
          },
        },
      },
      include: { participantes: true },
    });

    if (!destino) {
      return viagem;
    }

    const destinoSugerido = await tx.destinoSugerido.create({
      data: {
        viagemId: viagem.id,
        nomeDestino: destino,
        geradoPorIa: false,
      },
    });

    return tx.viagem.update({
      where: { id: viagem.id },
      data: { destinoFinalId: destinoSugerido.id },
      include: { participantes: true, destinoFinal: true },
    });
  });
}

export async function buscarViagemComParticipantes({ viagemId, usuarioId }) {
  const souParticipante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!souParticipante) {
    throw new Error("SEM_PERMISSAO");
  }

  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    include: {
      participantes: {
        include: {
          usuario: {
            select: { id: true, nome: true, email: true },
          },
        },
      },
    },
  });

  if (!viagem) {
    throw new Error("VIAGEM_NAO_ENCONTRADA");
  }

  return viagem;
}

export async function listarMinhasViagens({ usuarioId }) {
  const participacoes = await prisma.participanteViagem.findMany({
    where: { usuarioId },
    include: {
      viagem: {
        include: {
          destinoFinal: { select: { nomeDestino: true } },
          _count: { select: { participantes: true } },
        },
      },
    },
    orderBy: { viagem: { criadoEm: "desc" } },
  });

  return participacoes.map((p) => ({
    id: p.viagem.id,
    nome: p.viagem.nome,
    status: p.viagem.status,
    dataInicio: p.viagem.dataInicio,
    dataFim: p.viagem.dataFim,
    destino: p.viagem.destinoFinal?.nomeDestino ?? null,
    totalParticipantes: p.viagem._count.participantes,
    meuPapel: p.papel,
    meuStatusConvite: p.statusConvite,
  }));
}

export async function excluirViagem({ viagemId, solicitanteId }) {
  const admin = await prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId: solicitanteId, papel: "ADMIN" },
  });

  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }

  const viagem = await prisma.viagem.findUnique({ where: { id: viagemId } });
  if (!viagem) {
    throw new Error("VIAGEM_NAO_ENCONTRADA");
  }

  await prisma.$transaction([
    prisma.viagem.update({ where: { id: viagemId }, data: { destinoFinalId: null } }),
    prisma.mensagemAgente.deleteMany({ where: { participante: { viagemId } } }),
    prisma.preferenciaViagem.deleteMany({ where: { participante: { viagemId } } }),
    prisma.votoDestino.deleteMany({ where: { destino: { viagemId } } }),
    prisma.itemRoteiro.deleteMany({ where: { roteiro: { viagemId } } }),
    prisma.participacaoDespesa.deleteMany({ where: { despesa: { viagemId } } }),
    prisma.roteiro.deleteMany({ where: { viagemId } }),
    prisma.despesa.deleteMany({ where: { viagemId } }),
    prisma.destinoSugerido.deleteMany({ where: { viagemId } }),
    prisma.participanteViagem.deleteMany({ where: { viagemId } }),
    prisma.viagem.delete({ where: { id: viagemId } }),
  ]);
}