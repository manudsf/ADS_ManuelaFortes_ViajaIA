import * as participanteService from "../services/participante.service.js";

export async function convidar(req, res) {
  try {
    const { viagemId } = req.params;
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ erro: "O e-mail do convidado é obrigatório." });
    }

    const participante = await participanteService.convidarParticipante({
      viagemId,
      email,
      solicitanteId: req.usuarioId,
    });

    return res.status(201).json(participante);
  } catch (error) {
    if (error.message === "SEM_PERMISSAO") {
      return res.status(403).json({ erro: "Apenas o administrador pode convidar participantes." });
    }
    if (error.message === "USUARIO_NAO_ENCONTRADO") {
      return res.status(404).json({ erro: "Nenhum usuário cadastrado com esse e-mail." });
    }
    if (error.message === "JA_CONVIDADO") {
      return res.status(409).json({ erro: "Esse usuário já foi convidado para esta viagem." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao convidar participante." });
  }
}

export async function confirmar(req, res) {
  try {
    const { viagemId } = req.params;

    const participante = await participanteService.confirmarParticipacao({
      viagemId,
      usuarioId: req.usuarioId,
    });

    return res.status(200).json(participante);
  } catch (error) {
    if (error.message === "CONVITE_NAO_ENCONTRADO") {
      return res.status(404).json({ erro: "Você não tem um convite pendente para esta viagem." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao confirmar participação." });
  }
}

export async function recusar(req, res) {
  try {
    const { viagemId } = req.params;

    const participante = await participanteService.recusarConvite({
      viagemId,
      usuarioId: req.usuarioId,
    });

    return res.status(200).json(participante);
  } catch (error) {
    if (error.message === "CONVITE_NAO_ENCONTRADO") {
      return res.status(404).json({ erro: "Você não tem um convite pendente para esta viagem." });
    }
    if (error.message === "ADMIN_NAO_PODE_RECUSAR") {
      return res.status(400).json({ erro: "O administrador não pode recusar a própria viagem." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao recusar convite." });
  }
}

export async function remover(req, res) {
  try {
    const { viagemId, participanteId } = req.params;

    await participanteService.removerParticipante({
      viagemId,
      participanteId,
      solicitanteId: req.usuarioId,
    });

    return res.status(204).send();
  } catch (error) {
    if (error.message === "SEM_PERMISSAO") {
      return res.status(403).json({ erro: "Apenas o administrador pode remover participantes." });
    }
    if (error.message === "PARTICIPANTE_NAO_ENCONTRADO") {
      return res.status(404).json({ erro: "Participante não encontrado nesta viagem." });
    }
    if (error.message === "NAO_PODE_REMOVER_ADMIN") {
      return res.status(400).json({ erro: "Não é possível remover o administrador do grupo." });
    }
    console.error(error);
    return res.status(500).json({ erro: "Erro interno ao remover participante." });
  }
}