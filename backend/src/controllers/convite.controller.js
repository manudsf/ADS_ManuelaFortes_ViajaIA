import * as conviteService from "../services/convite.service.js";

function tratarErro(error, res, mensagemPadrao) {
  switch (error.message) {
    case "SEM_PERMISSAO":
      return res.status(403).json({ erro: "Apenas o administrador pode gerar ou desativar o link de convite." });
    case "CONVITE_INVALIDO":
      return res.status(404).json({ erro: "Este convite não existe mais ou já expirou." });
    default:
      console.error(error);
      return res.status(500).json({ erro: mensagemPadrao });
  }
}

export async function gerar(req, res) {
  try {
    const { viagemId } = req.params;
    const resultado = await conviteService.gerarLinkConvite({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(201).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao gerar o link de convite.");
  }
}

export async function revogar(req, res) {
  try {
    const { viagemId } = req.params;
    await conviteService.revogarLinkConvite({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(204).send();
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao desativar o link de convite.");
  }
}

export async function publico(req, res) {
  try {
    const { token } = req.params;
    const info = await conviteService.infoConvitePublico(token);
    return res.status(200).json(info);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao buscar o convite.");
  }
}

export async function aceitar(req, res) {
  try {
    const { token } = req.params;
    const resultado = await conviteService.aceitarConvite({
      token,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao entrar no grupo.");
  }
}