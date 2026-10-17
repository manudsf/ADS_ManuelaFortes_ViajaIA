import * as preferenciaService from "../services/preferencia.service.js";

export async function buscar(req, res) {
  try {
    const { viagemId } = req.params;
    const preferencia = await preferenciaService.buscarPreferencia({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(preferencia ?? {});
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de acessar as preferências." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao buscar preferências." });
  }
}

export async function gerar(req, res) {
  try {
    const { viagemId } = req.params;
    const preferencia = await preferenciaService.gerarPreferenciaDaConversa({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(preferencia);
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de acessar as preferências." });
    }
    if (error.message === "SEM_CONVERSA") {
      return res.status(400).json({ erro: "Ainda não há conversa com o agente para gerar um resumo." });
    }
    if (error.message === "FALHA_AO_INTERPRETAR_RESPOSTA") {
      return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA. Tente novamente." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao gerar preferências." });
  }
}

export async function editar(req, res) {
  try {
    const { viagemId } = req.params;
    const { orcamento, interesses, restricoes } = req.body;

    const preferencia = await preferenciaService.editarPreferencia({
      viagemId,
      usuarioId: req.usuarioId,
      orcamento,
      interesses,
      restricoes,
    });

    return res.status(200).json(preferencia);
  } catch (error) {
    if (error.message === "PARTICIPANTE_NAO_CONFIRMADO") {
      return res.status(403).json({ erro: "Confirme sua participação na viagem antes de editar as preferências." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao editar preferências." });
  }
}