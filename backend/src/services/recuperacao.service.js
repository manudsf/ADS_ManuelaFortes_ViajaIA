import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../db.js";
import { enviarRecuperacaoSenha } from "./email.service.js";

const APP_URL = process.env.APP_URL ?? "http://localhost:5173";
const VALIDADE = "1h";
const SALT_ROUNDS = 10;

// Pedaço do hash atual da senha: se a senha mudar, o link antigo deixa de valer.
const impressao = (senhaHash) => senhaHash.slice(-12);

export async function solicitarRecuperacao({ email }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  // Não revela se o e-mail existe: quem não tem conta não recebe nada, mas a resposta é a mesma.
  if (!usuario) return;

  const token = jwt.sign(
    { id: usuario.id, tipo: "recuperacao", h: impressao(usuario.senhaHash) },
    process.env.JWT_SECRET,
    { expiresIn: VALIDADE }
  );

  await enviarRecuperacaoSenha({
    para: usuario.email,
    nome: usuario.nome,
    link: `${APP_URL}/redefinir-senha/${token}`,
  });
}

export async function redefinirSenha({ token, novaSenha }) {
  if (!novaSenha || novaSenha.length < 8) {
    throw new Error("SENHA_CURTA");
  }

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    throw new Error("TOKEN_INVALIDO");
  }

  if (payload.tipo !== "recuperacao") {
    throw new Error("TOKEN_INVALIDO");
  }

  const usuario = await prisma.usuario.findUnique({ where: { id: payload.id } });
  if (!usuario || impressao(usuario.senhaHash) !== payload.h) {
    throw new Error("TOKEN_INVALIDO");
  }

  const senhaHash = await bcrypt.hash(novaSenha, SALT_ROUNDS);
  await prisma.usuario.update({ where: { id: usuario.id }, data: { senhaHash } });
}