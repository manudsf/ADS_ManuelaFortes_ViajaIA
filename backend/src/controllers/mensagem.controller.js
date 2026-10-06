import * as agenteService from "../services/agente.service.js";

export async function listar(req, res) {
  try {
    const { viagemId } = req.params;
    const mensagens = await agenteService.listarMensagens({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(mensagens);
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de acessar o chat." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao buscar mensagens." });
  }
}

export async function enviar(req, res) {
  try {
    const { viagemId } = req.params;
    const { conteudo } = req.body;

    if (!conteudo) {
      return res.status(400).json({ erro: "A mensagem não pode estar vazia." });
    }

    const resposta = await agenteService.enviarMensagem({
      viagemId,
      usuarioId: req.usuarioId,
      conteudo,
    });

    return res.status(201).json(resposta);
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de acessar o chat." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao enviar mensagem." });
  }
}