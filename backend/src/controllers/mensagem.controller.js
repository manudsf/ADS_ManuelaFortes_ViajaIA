import * as agenteService from "../services/agente.service.js";

const ERRO_IA_INDISPONIVEL = {
  erro: "O agente de IA está sobrecarregado no momento. Tente novamente em instantes.",
};

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
    if (error.message === "CONVERSA_ENCERRADA") {
      return res.status(409).json({ erro: "Você já concluiu a conversa com o agente." });
    }
    if (error.message === "IA_INDISPONIVEL") {
      return res.status(503).json(ERRO_IA_INDISPONIVEL);
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao enviar mensagem." });
  }
}

export async function concluir(req, res) {
  try {
    const { viagemId } = req.params;

    const resultado = await agenteService.concluirConversa({
      viagemId,
      usuarioId: req.usuarioId,
    });

    return res.status(201).json(resultado);
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de acessar o chat." });
    }
    if (error.message === "CONVERSA_ENCERRADA") {
      return res.status(409).json({ erro: "Você já concluiu a conversa com o agente." });
    }
    if (error.message === "SEM_CONVERSA") {
      return res.status(400).json({ erro: "Converse com o agente antes de concluir." });
    }
    if (error.message === "FALHA_AO_INTERPRETAR_RESPOSTA") {
      return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA. Tente concluir novamente." });
    }
    if (error.message === "IA_INDISPONIVEL") {
      return res.status(503).json(ERRO_IA_INDISPONIVEL);
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao concluir a conversa." });
  }
}