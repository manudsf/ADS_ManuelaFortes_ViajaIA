import * as recuperacaoService from "../services/recuperacao.service.js";

export async function esqueci(req, res) {
  try {
    const { email } = req.body ?? {};

    if (!email || !String(email).trim()) {
      return res.status(400).json({ erro: "Informe seu e-mail." });
    }

    await recuperacaoService.solicitarRecuperacao({ email: String(email).trim() });

    return res.status(200).json({
      mensagem: "Se o e-mail estiver cadastrado, você vai receber o link em instantes.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao solicitar a recuperação." });
  }
}

export async function redefinir(req, res) {
  try {
    const { token, novaSenha } = req.body ?? {};

    if (!token || !novaSenha) {
      return res.status(400).json({ erro: "Token e nova senha são obrigatórios." });
    }

    await recuperacaoService.redefinirSenha({ token, novaSenha });
    return res.status(204).send();
  } catch (error) {
    switch (error.message) {
      case "SENHA_CURTA":
        return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 8 caracteres." });
      case "TOKEN_INVALIDO":
        return res.status(400).json({ erro: "Este link expirou ou já foi usado. Peça um novo." });
      default:
        console.error(error);
        return res.status(500).json({ erro: "Erro interno ao redefinir a senha." });
    }
  }
}