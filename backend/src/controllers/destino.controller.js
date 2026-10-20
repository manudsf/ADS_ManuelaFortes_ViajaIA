import * as destinoService from "../services/destino.service.js";

function tratarErro(error, res, mensagemPadrao) {
  switch (error.message) {
    case "SEM_PERMISSAO":
      return res.status(403).json({ erro: "Apenas o administrador pode realizar esta ação." });
    case "PARTICIPANTE_NAO_CONFIRMADO":
      return res.status(403).json({ erro: "Confirme sua participação na viagem para acessar os destinos." });
    case "VIAGEM_NAO_ENCONTRADA":
      return res.status(404).json({ erro: "Viagem não encontrada." });
    case "DESTINO_NAO_ENCONTRADO":
      return res.status(404).json({ erro: "Destino não encontrado nesta viagem." });
    case "DESTINO_JA_DEFINIDO":
      return res.status(409).json({ erro: "O destino desta viagem já foi definido." });
    case "VOTACAO_ENCERRADA":
      return res.status(409).json({ erro: "A votação já foi encerrada." });
    case "VOTACAO_EM_ANDAMENTO":
      return res.status(409).json({ erro: "Já existem votos registrados, não é possível gerar novas sugestões." });
    case "JA_VOTOU":
      return res.status(409).json({ erro: "Você já votou nesta viagem." });
    case "CONVERSAS_PENDENTES":
      return res.status(409).json({
        erro: `Ainda há ${error.pendentes} participante(s) que não concluíram a conversa com o agente.`,
      });
    case "EMPATE":
      return res.status(409).json({
        erro: "Não há um destino vencedor. Escolha um dos empatados enviando o destinoId.",
        empatados: error.empatados,
      });
    case "DESTINO_FORA_DO_EMPATE":
      return res.status(400).json({ erro: "O destino informado não está entre os mais votados." });
    case "SEM_DESTINOS":
      return res.status(400).json({ erro: "Ainda não há destinos sugeridos para esta viagem." });
    case "FALHA_AO_INTERPRETAR_RESPOSTA":
      return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA. Tente novamente." });
    case "IA_INDISPONIVEL":
      return res.status(503).json({ erro: "O agente de IA está sobrecarregado no momento. Tente novamente em instantes." });
    default:
      console.error(error);
      return res.status(500).json({ erro: mensagemPadrao });
  }
}

export async function sugerir(req, res) {
  try {
    const { viagemId } = req.params;
    const resultado = await destinoService.sugerirDestinos({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(201).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao sugerir destinos.");
  }
}

export async function listar(req, res) {
  try {
    const { viagemId } = req.params;
    const resultado = await destinoService.listarDestinos({
      viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao listar destinos.");
  }
}

export async function votar(req, res) {
  try {
    const { viagemId, destinoId } = req.params;
    const resultado = await destinoService.votar({
      viagemId,
      usuarioId: req.usuarioId,
      destinoId,
    });
    return res.status(201).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao registrar voto.");
  }
}

export async function encerrar(req, res) {
  try {
    const { viagemId } = req.params;
    const destinoId = req.body?.destinoId;

    const resultado = await destinoService.encerrarVotacao({
      viagemId,
      usuarioId: req.usuarioId,
      destinoId,
    });
    return res.status(200).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao encerrar votação.");
  }
}