import * as viagemService from "../services/viagem.service.js";

export async function criar(req, res) {
  try {
    const { nome, dataInicio, dataFim } = req.body;

    if (!nome) {
      return res.status(400).json({ erro: "O nome da viagem é obrigatório." });
    }

    const viagem = await viagemService.criarViagem({
      nome,
      dataInicio,
      dataFim,
      criadoPorId: req.usuarioId,
    });

    return res.status(201).json(viagem);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao criar a viagem." });
  }
}

export async function buscar(req, res) {
  try {
    const { viagemId } = req.params;

    const viagem = await viagemService.buscarViagemComParticipantes({
      viagemId,
      usuarioId: req.usuarioId,
    });

    return res.status(200).json(viagem);
  } catch (error) {
    if (error.message === "SEM_PERMISSAO") {
      return res.status(403).json({ erro: "Você precisa ser participante desta viagem para vê-la." });
    }
    if (error.message === "VIAGEM_NAO_ENCONTRADA") {
      return res.status(404).json({ erro: "Viagem não encontrada." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao buscar viagem." });
  }
}

export async function excluir(req, res) {
  try {
    const { viagemId } = req.params;

    await viagemService.excluirViagem({
      viagemId,
      solicitanteId: req.usuarioId,
    });

    return res.status(204).send();
  } catch (error) {
    if (error.message === "SEM_PERMISSAO") {
      return res.status(403).json({ erro: "Apenas o administrador pode excluir a viagem." });
    }
    if (error.message === "VIAGEM_NAO_ENCONTRADA") {
      return res.status(404).json({ erro: "Viagem não encontrada." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao excluir viagem." });
  }
}