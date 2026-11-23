import bcrypt from "bcryptjs";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { prisma } from "../db.js";

const SALT_ROUNDS = 10;
const clienteGoogle = new OAuth2Client();

export async function cadastrarUsuario({ nome, email, senha, telefone }) {
  const usuarioExistente = await prisma.usuario.findUnique({ where: { email } });

  if (usuarioExistente) {
    throw new Error("EMAIL_JA_CADASTRADO");
  }

  const senhaHash = await bcrypt.hash(senha, SALT_ROUNDS);

  const usuario = await prisma.usuario.create({
    data: { nome, email, senhaHash, telefone },
  });

  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
  };
}

export async function autenticarUsuario({ email, senha }) {
  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaCorreta) {
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  return criarSessao(usuario);
}

function criarSessao(usuario) {
  const token = jwt.sign(
    { id: usuario.id, email: usuario.email },
    process.env.JWT_SECRET,
    { expiresIn: "7d" }
  );

  return {
    token,
    usuario: {
      id: usuario.id,
      nome: usuario.nome,
      email: usuario.email,
    },
  };
}

// Entrada com conta Google: valida o ID token no servidor e cria ou vincula a conta pelo e-mail verificado.
export async function autenticarComGoogle({ credential }) {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw new Error("GOOGLE_NAO_CONFIGURADO");
  }

  let payload;
  try {
    const ticket = await clienteGoogle.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });
    payload = ticket.getPayload();
  } catch {
    throw new Error("GOOGLE_TOKEN_INVALIDO");
  }

  if (!payload?.email || !payload.email_verified) {
    throw new Error("GOOGLE_TOKEN_INVALIDO");
  }

  let usuario = await prisma.usuario.findUnique({ where: { email: payload.email } });

  if (!usuario) {
    // Conta criada pelo Google não tem senha conhecida; quem quiser senha usa "Esqueci minha senha".
    const senhaAleatoria = crypto.randomBytes(32).toString("hex");
    usuario = await prisma.usuario.create({
      data: {
        nome: payload.name || payload.email.split("@")[0],
        email: payload.email,
        senhaHash: await bcrypt.hash(senhaAleatoria, SALT_ROUNDS),
      },
    });
  }

  return criarSessao(usuario);
}