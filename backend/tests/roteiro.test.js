import { describe, it, expect, vi } from "vitest";

vi.mock("../src/db.js", () => ({ prisma: {} }));
vi.mock("../src/services/gemini.service.js", () => ({ gerarTexto: vi.fn() }));
vi.mock("../src/services/email.service.js", () => ({ notificarParticipantes: vi.fn() }));

const { interpretarRoteiro } = await import("../src/services/roteiro.service.js");

const item = (periodo, titulo, extra = {}) => ({
  periodo,
  tipo: "ATIVIDADE",
  titulo,
  descricao: "Descrição",
  valor: 50,
  ...extra,
});

describe("interpretarRoteiro", () => {
  it("ordena os itens por dia e período e numera a ordem dentro de cada dia", () => {
    const dados = {
      dias: [
        { dia: 2, itens: [item("NOITE", "Jantar"), item("MANHA", "Museu")] },
        { dia: 1, itens: [item("TARDE", "Praia"), item("MANHA", "Caminhada")] },
      ],
    };

    const { itens } = interpretarRoteiro(dados, 2);

    expect(itens.map((i) => [i.dia, i.periodo, i.titulo, i.ordem])).toEqual([
      [1, "MANHA", "Caminhada", 1],
      [1, "TARDE", "Praia", 2],
      [2, "MANHA", "Museu", 1],
      [2, "NOITE", "Jantar", 2],
    ]);
  });

  it("aceita período e tipo em minúsculas, normalizando para maiúsculas", () => {
    const dados = {
      dias: [{ dia: 1, itens: [item("manha", "Café", { tipo: "restaurante" })] }],
    };

    const { itens } = interpretarRoteiro(dados, 1);

    expect(itens[0].periodo).toBe("MANHA");
    expect(itens[0].tipo).toBe("RESTAURANTE");
  });

  it("descarta itens inválidos e mantém os válidos", () => {
    const dados = {
      dias: [
        {
          dia: 1,
          itens: [
            item("MANHA", "Válido"),
            item("MADRUGADA", "Período inexistente"),
            item("TARDE", "Tipo inexistente", { tipo: "SHOW" }),
            item("NOITE", "   "),
          ],
        },
      ],
    };

    const { itens } = interpretarRoteiro(dados, 1);

    expect(itens.map((i) => i.titulo)).toEqual(["Válido"]);
  });

  it("ignora dias fora do intervalo da viagem", () => {
    const dados = {
      dias: [
        { dia: 1, itens: [item("MANHA", "Dia 1")] },
        { dia: 5, itens: [item("MANHA", "Dia 5 inexistente")] },
        { dia: 0, itens: [item("MANHA", "Dia 0")] },
      ],
    };

    const { itens } = interpretarRoteiro(dados, 1);

    expect(itens.map((i) => i.titulo)).toEqual(["Dia 1"]);
  });

  it("transforma valor não numérico em null", () => {
    const dados = {
      dias: [{ dia: 1, itens: [item("MANHA", "Sem preço", { valor: "R$ 50" })] }],
    };

    const { itens } = interpretarRoteiro(dados, 1);

    expect(itens[0].valor).toBeNull();
  });

  it("falha quando algum dia da viagem não tem atividades válidas", () => {
    const dados = {
      dias: [
        { dia: 1, itens: [item("MANHA", "Dia 1")] },
        { dia: 2, itens: [item("MANHA", "   ")] },
      ],
    };

    expect(() => interpretarRoteiro(dados, 2)).toThrow("FALHA_AO_INTERPRETAR_RESPOSTA");
  });

  it("falha quando a resposta não traz a lista de dias", () => {
    expect(() => interpretarRoteiro({}, 1)).toThrow("FALHA_AO_INTERPRETAR_RESPOSTA");
    expect(() => interpretarRoteiro(null, 1)).toThrow("FALHA_AO_INTERPRETAR_RESPOSTA");
  });
});
