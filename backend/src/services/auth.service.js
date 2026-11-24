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

// RF16: bloqueio temporário após tentativas inválidas de login (controle em memória, por e-mail).
const TENTATIVAS_MAXIMAS = 5;
const TEMPO_BLOQUEIO_MS = 15 * 60 * 1000;
const falhasLogin = new Map(); // e-mail -> { falhas, bloqueadoAte }

function verificarBloqueio(email) {
  const registro = falhasLogin.get(email);
  if (!registro?.bloqueadoAte) return;

  if (Date.now() < registro.bloqueadoAte) {
    throw new Error("CONTA_BLOQUEADA");
  }

  falhasLogin.delete(email);
}

function registrarFalha(email) {
  const registro = falhasLogin.get(email) ?? { falhas: 0, bloqueadoAte: 0 };
  registro.falhas += 1;

  if (registro.falhas >= TENTATIVAS_MAXIMAS) {
    registro.bloqueadoAte = Date.now() + TEMPO_BLOQUEIO_MS;
    registro.falhas = 0;
  }

  falhasLogin.set(email, registro);
}

export async function autenticarUsuario({ email, senha }) {
  verificarBloqueio(email);

  const usuario = await prisma.usuario.findUnique({ where: { email } });

  if (!usuario) {
    registrarFalha(email);
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  const senhaCorreta = await bcrypt.compare(senha, usuario.senhaHash);

  if (!senhaCorreta) {
    registrarFalha(email);
    throw new Error("CREDENCIAIS_INVALIDAS");
  }

  falhasLogin.delete(email);
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