import bcrypt from "bcryptjs";
import { prisma } from "../db.js";

const SALT_ROUNDS = 10;

export async function buscarPerfil({ usuarioId }) {
  const usuario = await prisma.usuario.findUnique({
    where: { id: usuarioId },
    select: { id: true, nome: true, apelido: true, email: true, telefone: true, criadoEm: true },
  });

  if (!usuario) {
    throw new Error("USUARIO_NAO_ENCONTRADO");
  }

  const participacoes = await prisma.participanteViagem.findMany({
    where: { usuarioId, statusConvite: "ACEITO" },
    include: { viagem: { select: { status: true, dataFim: true } } },
  });

  const hoje = new Date();
  const viagensConcluidas = participacoes.filter(
    (p) => p.viagem.status === "CONCLUIDA" || (p.viagem.dataFim && p.viagem.dataFim < hoje)
  ).length;

  return {
    ...usuario,
    estatisticas: {
      viagensParticipando: participacoes.length,
      viagensConcluidas,
      viagensAdministradas: participacoes.filter((p) => p.papel === "ADMIN").length,
    },
  };
}

export async function atualizarPerfil({ usuarioId, nome, apelido, telefone }) {
  const dados = {};

  if (nome !== undefined) {
    if (!nome.trim()) throw new Error("NOME_OBRIGATORIO");
    dados.nome = nome.trim();
  }
  if (apelido !== undefined) dados.apelido = apelido.trim() || null;
  if (telefone !== undefined) dados.telefone = telefone.trim() || null;

  return prisma.usuario.update({
    where: { id: usuarioId },
    data: dados,
    select: { id: true, nome: true, apelido: true, email: true, telefone: true },
  });
}

export async function trocarSenha({ usuarioId, senhaAtual, novaSenha }) {
  if (!novaSenha || novaSenha.length < 8) {
    throw new Error("SENHA_CURTA");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: usuarioId } });
  if (!usuario) throw new Error("USUARIO_NAO_ENCONTRADO");

  const confere = await bcrypt.compare(senhaAtual ?? "", usuario.senhaHash);
  if (!confere) throw new Error("SENHA_ATUAL_INCORRETA");

  const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await prisma.usuario.update({ where: { id: usuarioId }, data: { senhaHash } });
}