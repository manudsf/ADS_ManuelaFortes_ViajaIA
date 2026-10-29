import crypto from "node:crypto";
import { prisma } from "../db.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const DIAS_VALIDADE = 7;

async function exigirAdmin(viagemId, usuarioId) {
  const admin = await prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId, papel: "ADMIN" },
  });

  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }
}

export async function gerarLinkConvite({ viagemId, usuarioId }) {
  await exigirAdmin(viagemId, usuarioId);

  const token = crypto.randomBytes(24).toString("base64url");
  const expiraEm = new Date(Date.now() + DIAS_VALIDADE * 24 * 60 * 60 * 1000);

  await prisma.$transaction([
    prisma.conviteLink.deleteMany({ where: { viagemId } }),
    prisma.conviteLink.create({
      data: { viagemId, token, criadoPorId: usuarioId, expiraEm },
    }),
  ]);

  return { url: `${APP_URL}/convite/${token}`, expiraEm };
}

export async function revogarLinkConvite({ viagemId, usuarioId }) {
  await exigirAdmin(viagemId, usuarioId);
  await prisma.conviteLink.deleteMany({ where: { viagemId } });
}

export async function infoConvitePublico(token) {
  const link = await prisma.conviteLink.findUnique({
    where: { token },
    include: {
      viagem: {
        include: {
          participantes: {
            where: { papel: "ADMIN" },
            include: { usuario: { select: { nome: true } } },
          },
          _count: { select: { participantes: true } },
        },
      },
    },
  });

  if (!link || link.expiraEm < new Date()) {
    throw new Error("CONVITE_INVALIDO");
  }

  return {
    nomeViagem: link.viagem.nome,
    nomeAdmin: link.viagem.participantes[0]?.usuario.nome ?? null,
    totalParticipantes: link.viagem._count.participantes,
    expiraEm: link.expiraEm,
  };
}

export async function aceitarConvite({ token, usuarioId }) {
  const link = await prisma.conviteLink.findUnique({ where: { token } });

  if (!link || link.expiraEm < new Date()) {
    throw new Error("CONVITE_INVALIDO");
  }

  const existente = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId: link.viagemId } },
  });

  if (!existente) {
    await prisma.participanteViagem.create({
      data: {
        viagemId: link.viagemId,
        usuarioId,
        papel: "MEMBRO",
        statusConvite: "ACEITO",
      },
    });
  } else if (existente.statusConvite !== "ACEITO") {
    await prisma.participanteViagem.update({
      where: { id: existente.id },
      data: { statusConvite: "ACEITO" },
    });
  }

  return { viagemId: link.viagemId };
}