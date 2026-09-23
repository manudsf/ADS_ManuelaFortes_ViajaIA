import * as authService from "../services/auth.service.js";

export async function cadastrar(req, res) {
  try {
    const { nome, email, senha, telefone } = req.body;

    if (!nome || !email || !senha) {
      return res.status(400).json({ erro: "Nome, e-mail e senha são obrigatórios." });
    }

    const usuario = await authService.cadastrarUsuario({ nome, email, senha, telefone });
    return res.status(201).json(usuario);
  } catch (error) {
    if (error.message === "EMAIL_JA_CADASTRADO") {
      return res.status(409).json({ erro: "Este e-mail já está cadastrado." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao cadastrar usuário." });
  }
}

export async function login(req, res) {
  try {
    const { email, senha } = req.body;

    if (!email || !senha) {
      return res.status(400).json({ erro: "E-mail e senha são obrigatórios." });
    }

    const resultado = await authService.autenticarUsuario({ email, senha });
    return res.status(200).json(resultado);
  } catch (error) {
    if (error.message === "CREDENCIAIS_INVALIDAS") {
      return res.status(401).json({ erro: "E-mail ou senha inválidos." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao autenticar usuário." });
  }
}