import * as roteiroService from "../services/roteiro.service.js";

function tratarErro(error, res, mensagemPadrao) {
  switch (error.message) {
    case "SEM_PERMISSAO":
      return res.status(403).json({ erro: "Apenas o administrador pode gerar o roteiro." });
    case "PARTICIPANTE_NAO_CONFIRMADO":
      return res.status(403).json({ erro: "Confirme sua participação na viagem para ver o roteiro." });
    case "VIAGEM_NAO_ENCONTRADA":
      return res.status(404).json({ erro: "Viagem não encontrada." });
    case "ROTEIRO_NAO_GERADO":
      return res.status(404).json({ erro: "O roteiro desta viagem ainda não foi gerado." });
    case "DESTINO_NAO_DEFINIDO":
      return res.status(409).json({ erro: "Defina o destino da viagem antes de gerar o roteiro." });
    case "CONVERSAS_PENDENTES":
      return res.status(409).json({
        erro: `Ainda há ${error.pendentes} participante(s) que não concluíram a conversa com o agente.`,
      });
    case "DATAS_NAO_DEFINIDAS":
      return res.status(400).json({ erro: "Informe dataInicio e dataFim (ex: 2026-12-20) no corpo da requisição." });
    case "DATAS_INVALIDAS":
      return res.status(400).json({ erro: "Datas inválidas. A data final não pode ser anterior à inicial." });
    case "DURACAO_MAXIMA_EXCEDIDA":
      return res.status(400).json({ erro: `A viagem pode ter no máximo ${error.maximo} dias para gerar o roteiro.` });
    case "FALHA_AO_INTERPRETAR_RESPOSTA":
      return res.status(502).json({ erro: "Não foi possível interpretar a resposta da IA. Tente gerar novamente." });
    case "IA_INDISPONIVEL":
      return res.status(503).json({ erro: "O agente de IA está sobrecarregado no momento. Tente novamente em instantes." });
    default:
      console.error(error);
      return res.status(500).json({ erro: mensagemPadrao });
  }
}

export async function gerar(req, res) {
  try {
    const { viagemId } = req.params;
    const { dataInicio, dataFim } = req.body ?? {};

    const roteiro = await roteiroService.gerarRoteiro({
      viagemId,
      usuarioId: req.usuarioId,
      dataInicio,
      dataFim,
    });

    return res.status(201).json(roteiro);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao gerar o roteiro.");
  }
}

export async function visualizar(req, res) {
  try {
    const { viagemId } = req.params;

    const roteiro = await roteiroService.visualizarRoteiro({
      viagemId,
      usuarioId: req.usuarioId,
    });

    return res.status(200).json(roteiro);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao buscar o roteiro.");
  }
}