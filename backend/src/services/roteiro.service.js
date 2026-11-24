import { prisma } from "../db.js";
import { gerarTexto } from "./gemini.service.js";
import { notificarParticipantes } from "./email.service.js";
import { limparTextoIA } from "../utils/textoIA.js";

const MAX_DIAS = 14;
const TIPOS_VALIDOS = ["HOSPEDAGEM", "PONTO_TURISTICO", "ATIVIDADE", "RESTAURANTE"];
const PERIODOS = ["MANHA", "TARDE", "NOITE"];
const MS_POR_DIA = 24 * 60 * 60 * 1000;
const APP_URL = process.env.APP_URL ?? "http://localhost:5173";

const INSTRUCAO_ROTEIRO = `
Você é um consultor de viagens experiente, especialista em montar roteiros para grupos de amigos no Brasil e no exterior. Seu trabalho é transformar as preferências do grupo em um roteiro realista, seguro, agradável e que caiba no orçamento.

## Antes de montar, considere sempre

- Duração e ritmo: quantos dias há, e se é uma viagem de descanso, de aventura ou de mistura. Dias de chegada e de partida são mais leves, sem atividades longas.
- Orçamento: o menor orçamento do grupo é o teto. Pense no custo total por pessoa (hospedagem, alimentação, transporte local, passeios e entradas) e nunca ultrapasse esse teto.
- Época do ano: clima, estação seca ou chuvosa, alta temporada, feriados e eventos. Se a época não for ideal para alguma atividade (praia no inverno, trilha na chuva), avise na descrição ou troque a opção.
- Logística: distância entre os pontos, tempo real de deslocamento e meio de transporte mais prático para o destino. Evite cruzar a cidade várias vezes no mesmo dia.
- Restrições do grupo: alimentação (vegetarianos, veganos, restrições alimentares), mobilidade (pouca caminhada, acessibilidade), idade e saúde, quando informadas.
- Interesses: traga variedade de experiências (natureza, cultura, gastronomia, vida noturna, descanso), sem concentrar tudo em um único tipo.
- Tipo de viagem: adapte as atividades ao tipo informado. Em viagens românticas ou de casal, prefira experiências a dois. Em aniversários e datas especiais, inclua um momento marcante. Em viagens de família, prefira atividades para todas as idades. Entre amigos, privilegie experiências em grupo.

## Como organizar cada dia

- Manhã: atividades que pedem energia ou que têm melhor qualidade cedo, como trilhas, praias calmas, mirantes, museus com menos gente e passeios de barco que saem cedo.
- Tarde: passeios de maior duração, compras, visitas a centros históricos e atividades mais tranquilas no calor do dia.
- Noite: jantares, pôr do sol, shows, vida noturna e passeios que só funcionam à noite.
- Almoço e jantar: sugira restaurantes ou tipos de comida típica da região, com faixa de preço ($, $$ ou $$$) e avise quando é preciso reservar.
- Agrupe as atividades de cada dia por região ou bairro, para reduzir deslocamentos.
- Respeite horários de funcionamento reais: museus e parques costumam fechar no fim da tarde, praias e trilhas têm melhor horário, e alguns passeios só saem em dias específicos.

## Hospedagem

- Escolha uma hospedagem que faça sentido para a logística: próxima das atividades principais, com bom custo-benefício e compatível com o tamanho do grupo.
- Descreva o bairro, o tipo de hospedagem e o motivo da escolha no resumo.
- Estime a diária para o grupo, em R$, de forma realista para a época e o destino.

## Valores

- Sempre em R$ e por pessoa, salvo quando a descrição indicar outra base.
- Use valores aproximados e realistas para a região. Quando não tiver certeza de um preço exato, indique a faixa, sem inventar precisão.
- Se o orçamento for baixo, priorize opções gratuitas ou econômicas: praias públicas, trilhas, mirantes, feiras e comida de rua.
- Some tudo para que o custo total estimado por pessoa caiba no orçamento.

## Qualidade e segurança

- Use apenas lugares reais e conhecidos. Se não tiver certeza de que um lugar existe, prefira uma alternativa mais conhecida.
- Nunca repita o mesmo lugar em dias diferentes.
- Avise sobre cuidados práticos quando forem relevantes: calor forte, trilhas que exigem preparo, passeios de barco sujeitos ao tempo, necessidade de documento ou de reserva antecipada.
- Não invente eventos, datas de festivais ou preços de promoções.
- Não cite nem atribua preferências a participantes específicos.

## Como escrever

- Português do Brasil, com tom acolhedor e direto, como um amigo que entende de viagem.
- Texto simples: nada de asteriscos, negrito, títulos em markdown ou emojis.
- Títulos curtos e claros nos itens, e descrições de 2 a 3 frases com uma dica prática.
- Evite exageros e termos vagos; prefira detalhes concretos, como o horário sugerido ou o motivo da escolha.

## Resultado

Ao final, o roteiro deve ser algo que o grupo consiga seguir sem precisar pesquisar mais nada: dias equilibrados, deslocamentos razoáveis, valores coerentes com o orçamento e uma experiência variada do começo ao fim da viagem.
`;

const TOM_POR_TIPO = {
  AMIGOS: "Viagem entre amigos: privilegie vida noturna, experiências em grupo e atividades animadas.",
  CASAL: "Viagem de casal: privilegie experiências a dois, passeios tranquilos e restaurantes românticos.",
  ROMANTICA: "Viagem romântica: privilegie pôr do sol, jantares especiais, spa, hospedagens com vista e ambientes reservados.",
  ANIVERSARIO: "Viagem para comemorar um aniversário: sugira experiências marcantes, jantares especiais e surpresas para a data.",
  DATA_ESPECIAL: "Viagem que marca uma data especial: sugira experiências que combinem com a ocasião.",
  FAMILIA: "Viagem em família: privilegie atividades para todas as idades, espaços seguros e ritmo sem pressa.",
};

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

function lerJson(texto) {
  try {
    return JSON.parse(texto.replace(/```json|```/g, "").trim());
  } catch {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }
}

function sanitizarResumo(r) {
  if (!r || typeof r !== "object") return null;

  const numero = (v) => (typeof v === "number" && Number.isFinite(v) ? v : null);
  const hospedagem = r.hospedagem && typeof r.hospedagem === "object" ? r.hospedagem : null;

  return {
    hospedagem: hospedagem
      ? { ...hospedagem, motivo: limparTextoIA(hospedagem.motivo ?? "") || null }
      : null,
    custoEstimadoPorPessoa: numero(r.custoEstimadoPorPessoa),
    observacoes: limparTextoIA(typeof r.observacoes === "string" ? r.observacoes : "") || null,
  };
}

export function interpretarRoteiro(dados, dias) {
  if (!dados || !Array.isArray(dados.dias)) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const itens = [];

  for (const d of dados.dias) {
    const dia = Number(d?.dia);
    if (!Number.isInteger(dia) || dia < 1 || dia > dias || !Array.isArray(d.itens)) continue;

    for (const it of d.itens) {
      const periodo = String(it?.periodo ?? "").toUpperCase();
      const tipo = String(it?.tipo ?? "").toUpperCase();
      const titulo = limparTextoIA(typeof it?.titulo === "string" ? it.titulo : "").trim();

      if (!PERIODOS.includes(periodo) || !TIPOS_VALIDOS.includes(tipo) || !titulo) continue;

      itens.push({
        dia,
        periodo,
        tipo,
        titulo,
        descricao: limparTextoIA(typeof it.descricao === "string" ? it.descricao : "").trim() || null,
        valor: typeof it.valor === "number" && Number.isFinite(it.valor) ? it.valor : null,
      });
    }
  }

  const diasCobertos = new Set(itens.map((i) => i.dia));
  if (diasCobertos.size < dias) {
    throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
  }

  const ordemPeriodo = Object.fromEntries(PERIODOS.map((p, i) => [p, i]));
  itens.sort((a, b) => a.dia - b.dia || ordemPeriodo[a.periodo] - ordemPeriodo[b.periodo]);

  const contadorPorDia = {};
  const itensComOrdem = itens.map((item) => {
    contadorPorDia[item.dia] = (contadorPorDia[item.dia] ?? 0) + 1;
    return { ...item, ordem: contadorPorDia[item.dia] };
  });

  return { itens: itensComOrdem, resumo: sanitizarResumo(dados.resumo) };
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
      periodo: item.periodo,
      tipo: item.tipo,
      titulo: item.titulo,
      descricao: item.descricao,
      valor: item.valor,
    });
  }

  const dias = [...porDia.entries()].map(([dia, itens]) => ({
    dia,
    data: viagem.dataInicio
      ? formatarData(new Date(viagem.dataInicio.getTime() + (dia - 1) * MS_POR_DIA))
      : null,
    totalDia: itens.reduce((soma, i) => soma + (i.valor ?? 0), 0),
    itens,
  }));

  return {
    viagemId,
    destino: viagem.destinoFinal?.nomeDestino ?? null,
    dataInicio: viagem.dataInicio,
    dataFim: viagem.dataFim,
    geradoEm: roteiro.geradoEm,
    resumo: roteiro.resumo ?? null,
    dias,
  };
}

export async function gerarRoteiro({ viagemId, usuarioId, dataInicio, dataFim, ajustes }) {
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

  const participantes = await prisma.participanteViagem.findMany({
    where: { viagemId, statusConvite: "ACEITO" },
    include: { preferencia: true, mensagens: { orderBy: { criadoEm: "asc" } } },
  });

  const pendentes = participantes.filter((p) => !p.conversaConcluidaEm).length;
  if (pendentes > 0) {
    const erro = new Error("CONVERSAS_PENDENTES");
    erro.pendentes = pendentes;
    throw erro;
  }

  // Regra de datas:
  // - Se o admin enviou datas na requisição, elas valem.
  // - Se não há datas salvas, ou se há pedido de ajuste, a IA escolhe o período.
  // - Caso contrário, mantém as datas já salvas.
  const datasInformadas = Boolean(dataInicio && dataFim);
  const datasAtuais = Boolean(viagem.dataInicio && viagem.dataFim);
  const definirDatasPelaIA = !datasInformadas && (!datasAtuais || Boolean(ajustes));

  let inicio;
  let fim;
  let dias;

  if (!definirDatasPelaIA) {
    ({ inicio, fim, dias } = calcularPeriodo(
      datasInformadas ? dataInicio : viagem.dataInicio,
      datasInformadas ? dataFim : viagem.dataFim
    ));
  }

  const pessoas = participantes.length;

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

  const trechosConversa = participantes
    .flatMap((p) => p.mensagens)
    .filter((m) => m.remetente === "USUARIO")
    .map((m) => m.conteudo)
    .join("\n- ");

  const tipoTexto = viagem.tipoViagem
    ? `${TOM_POR_TIPO[viagem.tipoViagem] ?? viagem.tipoViagem}${viagem.detalheTipo ? ` (${viagem.detalheTipo})` : ""}`
    : "Entre amigos (padrão)";

  const hoje = formatarData(new Date());

  const blocoDatas = definirDatasPelaIA
    ? `Data de hoje: ${hoje}
Período: ${
        datasAtuais
          ? `atualmente ${formatarData(viagem.dataInicio)} a ${formatarData(viagem.dataFim)}. Mantenha esse período, a menos que os pedidos de ajuste peçam outras datas.`
          : `NÃO informado pelo admin. Escolha você um período de até ${MAX_DIAS} dias que respeite o que o grupo contou nas conversas (época do ano, feriados, férias).`
      }
A data de ida nunca pode ser antes de hoje.
O que o grupo contou nas conversas:
- ${trechosConversa || "nada específico sobre datas"}`
    : `Duração: ${dias} dia(s), de ${formatarData(inicio)} a ${formatarData(fim)}`;

  const blocoAjustes = ajustes
    ? `
Pedidos de ajuste do admin (aplique com prioridade, inclusive nas datas se for pedido):
${ajustes}
`
    : "";

  const prompt = `
Monte um roteiro DETALHADO e prático para o grupo, com lugares reais do destino.

Destino: ${viagem.destinoFinal.nomeDestino}
Tipo de viagem: ${tipoTexto}
Pessoas no grupo: ${pessoas}
${blocoDatas}
Menor orçamento individual informado (por pessoa, para a viagem inteira, em R$): ${menorOrcamento ?? "não informado"}
Preferências anônimas do grupo:
${perfis}
${blocoAjustes}
Regras:
- Gere TODOS os dias do período, numerados a partir de 1.
- Cada dia deve ter itens nos três períodos: MANHA, TARDE e NOITE.
- Inclua pelo menos 1 item do tipo RESTAURANTE por dia (almoço ou jantar), com nome real, especialidade e faixa de preço ($, $$ ou $$$) na descrição.
- Na descrição de cada item, dê detalhes práticos: o que fazer, como chegar, horário sugerido e uma dica.
- No primeiro dia, inclua um item HOSPEDAGEM (check-in) no período TARDE ou NOITE.
- Adapte as atividades ao tipo de viagem informado, como orientado nas instruções gerais.
- Em "valor", coloque o custo aproximado em R$ por pessoa para aquele item (0 se for gratuito).
- Em "resumo.hospedagem", sugira UMA hospedagem real no destino, com bairro, tipo, preço da diária em R$ para o grupo e o motivo da escolha.
- Calcule "resumo.custoEstimadoPorPessoa" somando hospedagem dividida pelas pessoas, transporte, alimentação e passeios para a viagem inteira. Esse valor deve caber no menor orçamento informado, quando houver.
- Respeite todas as restrições do grupo.
- Não cite participantes nem atribua preferências a pessoas.
- Os valores são estimativas, não cotações exatas.
- Escreva em texto simples, sem asteriscos e sem emojis.

Responda APENAS com JSON válido, sem markdown, no formato:
{
  "resumo": {
    "dataInicio": "aaaa-mm-dd",
    "dataFim": "aaaa-mm-dd",
    "hospedagem": { "nome": "string", "tipo": "hotel | pousada | resort | apartamento", "bairro": "string", "precoDiaria": number, "motivo": "string" },
    "custoEstimadoPorPessoa": number,
    "observacoes": "string"
  },
  "dias": [
    {
      "dia": 1,
      "itens": [
        { "periodo": "MANHA | TARDE | NOITE", "tipo": "PONTO_TURISTICO | ATIVIDADE | RESTAURANTE | HOSPEDAGEM", "titulo": "string", "descricao": "string", "valor": number }
      ]
    }
  ]
}
`;

  const texto = await gerarTexto({
    systemInstruction: INSTRUCAO_ROTEIRO,
    contents: [{ role: "user", parts: [{ text: prompt }] }],
  });

  const dados = lerJson(texto);

  // Quando a IA escolhe as datas, a duração só é conhecida depois da resposta.
  if (definirDatasPelaIA) {
    const r = dados?.resumo ?? {};
    try {
      ({ inicio, fim, dias } = calcularPeriodo(r.dataInicio, r.dataFim));
    } catch {
      throw new Error("FALHA_AO_INTERPRETAR_RESPOSTA");
    }
  }

  const { itens, resumo } = interpretarRoteiro(dados, dias);

  const resumoFinal = {
    ...(resumo ?? {}),
    orcamentoPorPessoa: menorOrcamento,
    pessoas,
    dataInicio: formatarData(inicio),
    dataFim: formatarData(fim),
    dias,
    pedidoAjuste: ajustes ?? null,
    datasDefinidasPelaIA: definirDatasPelaIA,
  };

  await prisma.$transaction([
    prisma.itemRoteiro.deleteMany({ where: { roteiro: { viagemId } } }),
    prisma.roteiro.deleteMany({ where: { viagemId } }),
    prisma.roteiro.create({
      data: { viagemId, resumo: resumoFinal, itens: { create: itens } },
    }),
    prisma.viagem.update({
      where: { id: viagemId },
      data: { dataInicio: inicio, dataFim: fim, status: "ROTEIRO_PRONTO" },
    }),
  ]);

  const roteiroPronto = await montarRoteiro(viagemId);

  notificarParticipantes(viagemId, {
    assunto: `Roteiro pronto: ${viagem.nome}`,
    titulo: "O roteiro está pronto",
    texto: `Já montamos o roteiro dia a dia de "${viagem.nome}". Dá uma olhada e se prepare para viajar.`,
    link: `${APP_URL}/viagens/${viagemId}/roteiro`,
    textoBotao: "Ver o roteiro",
  });

  return roteiroPronto;
}

export async function visualizarRoteiro({ viagemId, usuarioId }) {
  await buscarParticipanteConfirmado(viagemId, usuarioId);

  const roteiro = await montarRoteiro(viagemId);
  if (!roteiro) {
    throw new Error("ROTEIRO_NAO_GERADO");
  }

  return roteiro;
}