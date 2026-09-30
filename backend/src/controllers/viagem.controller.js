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