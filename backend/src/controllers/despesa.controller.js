import * as despesaService from "../services/despesa.service.js";

function lerValor(valor) {
  if (typeof valor === "string") return Number(valor.replace(",", "."));
  return valor;
}

function tratarErro(error, res, mensagemPadrao) {
  switch (error.message) {
    case "PARTICIPANTE_NAO_CONFIRMADO":
      return res.status(403).json({ erro: "Confirme sua participação na viagem para ver as despesas." });
    case "SEM_PERMISSAO":
      return res.status(403).json({ erro: "Só quem registrou a despesa pode editá-la ou excluí-la." });
    case "DESPESA_NAO_ENCONTRADA":
      return res.status(404).json({ erro: "Despesa não encontrada nesta viagem." });
    case "VALOR_INVALIDO":
      return res.status(400).json({ erro: "Informe um valor maior que zero." });
    case "SEM_PARTICIPANTES_NA_DESPESA":
      return res.status(400).json({ erro: "Escolha pelo menos uma pessoa para dividir a conta." });
    default:
      console.error(error);
      return res.status(500).json({ erro: mensagemPadrao });
  }
}

export async function listar(req, res) {
  try {
    const lista = await despesaService.listarDespesas({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(lista);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao listar despesas.");
  }
}

export async function criar(req, res) {
  try {
    const { descricao, valor, participantesIds } = req.body ?? {};

    if (!descricao || !String(descricao).trim()) {
      return res.status(400).json({ erro: "Dê um nome para a despesa." });
    }

    const despesa = await despesaService.criarDespesa({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
      descricao: String(descricao).trim(),
      valor: lerValor(valor),
      participantesIds,
    });

    return res.status(201).json(despesa);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao registrar despesa.");
  }
}

export async function editar(req, res) {
  try {
    const { descricao, valor, participantesIds } = req.body ?? {};

    const despesa = await despesaService.editarDespesa({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
      despesaId: req.params.despesaId,
      descricao: descricao ? String(descricao).trim() : undefined,
      valor: valor !== undefined ? lerValor(valor) : undefined,
      participantesIds,
    });

    return res.status(200).json(despesa);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao editar despesa.");
  }
}

export async function excluir(req, res) {
  try {
    await despesaService.excluirDespesa({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
      despesaId: req.params.despesaId,
    });
    return res.status(204).send();
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao excluir despesa.");
  }
}

export async function saldos(req, res) {
  try {
    const resultado = await despesaService.calcularSaldos({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
    });
    return res.status(200).json(resultado);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao calcular saldos.");
  }
}

export async function historico(req, res) {
  try {
    const lista = await despesaService.listarHistorico({
      viagemId: req.params.viagemId,
      usuarioId: req.usuarioId,
      despesaId: req.params.despesaId,
    });
    return res.status(200).json(lista);
  } catch (error) {
    return tratarErro(error, res, "Erro interno ao buscar histórico.");
  }
}