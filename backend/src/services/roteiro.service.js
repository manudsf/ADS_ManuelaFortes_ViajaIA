import { prisma } from "../db.js";
import { gerarTexto } from "./gemini.service.js";
import { notificarParticipantes } from "./email.service.js";

const MAX_DIAS = 14;
const TIPOS_VALIDOS = ["HOSPEDAGEM", "PONTO_TURISTICO", "ATIVIDADE"];
const MS_POR_DIA = 24 * 60 * 60 * 1000;

function formatarData(data) {
  return data.toISOString().slice(0, 10);
}

async function buscarParticipanteConfirmado(viagemId, usuarioId) {
  const participante = await prisma.participanteViagem.findUnique({
    where: { usuarioId_viagemId: { usuarioId, viagemId } },
  });

  if (!participante || participante.statusConvite !== "ACEITO") {
    throw new Error("PARTICIPANTE_NAO_CONFIRMADO");
  }

  return participante;
}

async function exigirAdmin(viagemId, usuarioId) {
  const admin = await prisma.participanteViagem.findFirst({
    where: { viagemId, usuarioId, papel: "ADMIN" },
  });

  if (!admin) {
    throw new Error("SEM_PERMISSAO");
  }
}

function calcularPeriodo(dataInicio, dataFim) {
  const inicio = new Date(dataInicio);
  const fim = new Date(dataFim);

  if (Number.isNaN(inicio.getTime()) || Number.isNaN(fim.getTime()) || fim < inicio) {
    throw new Error("DATAS_INVALIDAS");
  }

  const dias = Math.round((fim - inicio) / MS_POR_DIA) + 1;

  if (dias > MAX_DIAS) {
    const erro = new Error("DURACAO_MAXIMA_EXCEDIDA");
    erro.maximo = MAX_DIAS;
    throw erro;
  }

  return { inicio, fim, dias };
}

function interpretarRoteiro(texto, dias) {
  let dados;
  try {
    dados = JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch (error) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const lista = Array.isArray(dados) ? dados : dados?.itens;
  if (!Array.isArray(lista)) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const itens = lista
    .map((item) => ({
      dia: Number(item?.dia),
      tipo: item?.tipo,
      titulo: typeof item?.titulo === "string" ? item.titulo.trim() : "",
      descricao: typeof item?.descricao === "string" ? item.descricao.trim() : null,
    }))
    .filter(
      (item) =>
        Number.isInteger(item.dia) &&
        item.dia >= 1 &&
        item.dia <= dias &&
        TIPOS_VALIDOS.includes(item.tipo) &&
        item.titulo
    );

  const diasCobertos = new Set(itens.map((item) => item.dia));
  if (diasCobertos.size < dias) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const ordemPorDia = {};

  return itens
    .sort(
      (a, b) =>
        a.dia - b.dia ||
        Number(b.tipo === "HOSPEDAGEM") - Number(a.tipo === "HOSPEDAGEM")
    )
    .map((item) => {
      ordemPorDia[item.dia] = (ordemPorDia[item.dia] ?? 0) + 1;
      return { ...item, ordem: ordemPorDia[item.dia] };
    });
}

async function montarRoteiro(viagemId) {
  const roteiro = await prisma.roteiro.findUnique({
    where: { viagemId },
    include: {
      itens: { orderBy: [{ dia: "asc" }, { ordem: "asc" }] },
      viagem: { include: { destinoFinal: true } },
    },
  });

  if (!roteiro) {
    return null;
  }

  const { viagem } = roteiro;
  const porDia = new Map();

  for (const item of roteiro.itens) {
    if (!porDia.has(item.dia)) {
      porDia.set(item.dia, []);
    }
    porDia.get(item.dia).push({
      id: item.id,
      tipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      ordem: item.ordem,
    });
  }

  const dias = [...porDia.entries()].map(([dia, itens]) => ({
    dia,
    data: viagem.dataInicio
      ? formatarData(new Date(viagem.dataInicio.getTime() + (dia - 1) * MS_POR_DIA))
      : null,
    itens,
  }));

  return {
    viagemId,
    destino: viagem.destinoFinal?.nomeDestino ?? null,
    dataInicio: viagem.dataInicio,
    dataFim: viagem.dataFim,
    geradoEm: roteiro.geradoEm,
    dias,
  };
}

export async function gerarRoteiro({ viagemId, usuarioId, dataInicio, dataFim }) {
  await exigirAdmin(viagemId, usuarioId);

  const viagem = await prisma.viagem.findUnique({
    where: { id: viagemId },
    include: { destinoFinal: true },
  });

  if (!viagem) {
    throw new Error("VIAGEM_NAO_ENCONTRADA");
  }

  if (!viagem.destinoFinal) {
    throw new Error("DESTINO_NAO_DEFINIDO");
  }

  const inicioInformado = dataInicio ?? viagem.dataInicio;
  const fimInformado = dataFim ?? viagem.dataFim;

  if (!inicioInformado || !fimInformado) {
    throw new Error("DATAS_NAO_DEFINIDAS");
  }

  const { inicio, fim, dias } = calcularPeriodo(inicioInformado, fimInformado);

  const participantes = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    include: { preferencia: true },
  });

  const pendentes = participantes.filter((p) => !p.conversaConcluidaEm).length;
  if (pendentes > 0) {
    const erro = new Error("CONVERSAS_PENDENTES");
    erro.pendentes = pendentes;
    throw erro;
  }

  const perfis = participantes
    .map((p, i) => {
      const pref = p.preferencia;
      return `Participante ${i + 1}: orçamento ${pref?.orcamento ?? "não informado"}; interesses: ${pref?.interesses ?? "não informados"}; restrições: ${pref?.restricoes ?? "nenhuma informada"}`;
    })
    .join("\n");

  const orcamentos = participantes
    .map((p) => p.preferencia?.orcamento)
    .filter((valor) => typeof valor === "number");
  const menorOrcamento = orcamentos.length > 0 ? Math.min(...orcamentos) : null;

  const prompt = `
Você é o agente de IA do ViajaIA. Monte um roteiro de viagem dia a dia para um grupo.

Destino: ${viagem.destinoFinal.nomeDestino}
Duração: ${dias} dia(s), de ${formatarData(inicio)} a ${formatarData(fim)}
Menor orçamento individual informado (por pessoa, para a viagem inteira): ${menorOrcamento ?? "não informado"}
Preferências anônimas do grupo:
${perfis}

Regras:
- Gere itens para TODOS os dias, de 1 a ${dias}.
- No dia 1, inclua exatamente 1 item do tipo HOSPEDAGEM (a mesma hospedagem vale para toda a estadia) e informe o valor aproximado da diária na descrição.
- Em cada dia, inclua de 2 a 4 itens dos tipos PONTO_TURISTICO ou ATIVIDADE, em ordem cronológica (manhã, tarde, noite).
- Alterne os tipos de atividade (praia, cultura, aventura, gastronomia etc.) para equilibrar os interesses do grupo ao longo dos dias.
- Respeite todas as restrições do grupo.
- Mantenha o custo total estimado por pessoa dentro do menor orçamento informado (se houver) e cite valores aproximados em reais (R$) nas descrições quando fizer sentido.
- Use apenas lugares reais e conhecidos do destino.
- Não cite participantes nem atribua preferências a pessoas.

Responda APENAS com um JSON válido, sem markdown e sem texto adicional, no formato:
{
  "itens": [
    { "dia": 1, "tipo": "HOSPEDAGEM", "titulo": "string", "descricao": "string" }
  ]
}
O campo "tipo" deve ser exatamente um de: HOSPEDAGEM, PONTO_TURISTICO, ATIVIDADE.
`;

  const texto = await gerarTexto({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const itens = interpretarRoteiro(texto, dias);

  await prisma.$transaction([
    prisma.itemRoteiro.deleteMany({ where: { roteiro: { viagemId } } }),
    prisma.roteiro.deleteMany({ where: { viagemId } }),
    prisma.roteiro.create({
      data: { viagemId, itens: { create: itens } },
    }),
    prisma.viagem.update({
      where: { id: viagemId },
      data: { dataInicio: inicio, dataFim: fim, status: "ROTEIRO_PRONTO" },
    }),
  ]);

  return montarRoteiro(viagemId);
}

export async function visualizarRoteiro({ viagemId, usuarioId }) {
  await buscarParticipanteConfirmado(viagemId, usuarioId);
  
    notificarParticipantes(viagemId, {
    assunto: `Roteiro pronto: ${viagem.nome}`,
    titulo: "O roteiro está pronto",
    texto: `Já montamos o roteiro dia a dia de "${viagem.nome}". Dá uma olhada e se prepare para viajar.`,
    link: `${process.env.APP_URL ?? "http://localhost:5173"}/viagens/${viagemId}`,
    textoBotao: "Ver o roteiro",
  });

  const roteiro = await montarRoteiro(viagemId);
  if (!roteiro) {
    throw new Error("ROTEIRO_NAO_GERADO");
  }

  return roteiro;
}