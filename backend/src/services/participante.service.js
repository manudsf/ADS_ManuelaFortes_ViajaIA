import { prisma } from "../db.js";

async function buscarParticipanteAdmin(viagemId, usuarioId) {
  return prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId, papel: "ADMIN" },
  });
}

export async function convidarParticipante({ viagemId, email, solicitanteId }) {
  const admin = await buscarParticipanteAdmin(viagemId, solicitanteId);
  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }

  const usuarioConvidado = await prisma.usuario.findUnique({ where: { email } });
  if (!usuarioConvidado) {
    throw new Error("USUARIO_NAO_ENCONTRADO");
  }

  const jaParticipa = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId: usuarioConvidado.id, viagemId } },
  });
  if (jaParticipa) {
    throw new Error("JA_CONVIDADO");
  }

  return prisma.participanteViagem.create({
    data: {
      viagemId,
      usuarioId: usuarioConvidado.id,
      papel: "MEMBRO",
      statusConvite: "PENDENTE",
    },
  });
}

export async function confirmarParticipacao({ viagemId, usuarioId }) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante) {
    throw new Error("CONVITE_NAO_ENCONTRADO");
  }

  return prisma.participanteViagem.update({
    where: { id: participante.id },
    data: { statusConvite: "ACEITO" },
  });
}

export async function removerParticipante({ viagemId, participanteId, solicitanteId }) {
  const admin = await buscarParticipanteAdmin(viagemId, solicitanteId);
  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }

  const participante = await prisma.participanteViagem.findUnique({
    where: { id: participanteId },
  });

  if (!participante || participante.viagemId !== viagemId) {
    throw new Error("PARTICIPANTE_NAO_ENCONTRADO");
  }

  if (participante.papel === "ADMIN") {
    throw new Error("NAO_PODE_REMOVER_ADMIN");
  }

  return prisma.participanteViagem.delete({ where: { id: participanteId } });
}