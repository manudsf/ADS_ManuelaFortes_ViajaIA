import * as perfilService from "../services/perfil.service.js";

function tratarErro(error, res, mensagemPadrao) {
  switch (error.message) {
    case "USUARIO_NAO_ENCONTRADO":
      return res.status(404).json({ erro: "Usuário não encontrado." });
    case "NOME_OBRIGATORIO":
      return res.status(400).json({ erro: "O nome não pode ficar vazio." });
    case "SENHA_CURTA":
      return res.status(400).json({ erro: "A nova senha precisa ter pelo menos 8 caracteres." });
    case "SENHA_ATUAL_INCORRETA":
      return res.status(400).json({ erro: "A senha atual não confere." });
    default:
      console.error(error);
      return res.status(500).json({ erro: mensagemPadrao });
  }
}

export async function buscar(req, res) {
  try {
    const perfil = await perfilService.buscarPerfil({ usuarioId: req.usuarioId });
    return res.status(200).json(perfil);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao buscar o perfil.");
  }
}

export async function atualizar(req, res) {
  try {
    const { nome, apelido, telefone } = req.body ?? {};
    const perfil = await perfilService.atualizarPerfil({
      usuarioId: req.usuarioId,
      nome,
      apelido,
      telefone,
    });
    return res.status(200).json(perfil);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao atualizar o perfil.");
  }
}

export async function senha(req, res) {
  try {
    const { senhaAtual, novaSenha } = req.body ?? {};
    await perfilService.trocarSenha({ usuarioId: req.usuarioId, senhaAtual, novaSenha });
    return res.status(204).send();
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao trocar a senha.");
  }
}