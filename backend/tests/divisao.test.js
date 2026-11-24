import { describe, it, expect, vi } from "vitest";

vi.mock("../src/db.js", () => ({ prisma: {} }));

const { dividirIgualmente } = await import("../src/services/despesa.service.js");

const centavos = (valor) => Math.round(valor * 100);

describe("dividirIgualmente", () => {
  it("divide um valor exato entre participantes sem sobra", () => {
    const divisao = dividirIgualmente(100, ["a", "b", "c", "d"]);

    expect(divisao.map((d) => d.valorDevido)).toEqual([25, 25, 25, 25]);
  });

  it("distribui os centavos que sobram entre os primeiros participantes", () => {
    const divisao = dividirIgualmente(10, ["a", "b", "c"]);

    expect(divisao.map((d) => d.valorDevido)).toEqual([3.34, 3.33, 3.33]);
  });

  it("atribui o valor inteiro a quem está sozinho na despesa", () => {
    const divisao = dividirIgualmente(47.9, ["a"]);

    expect(divisao).toEqual([{ usuarioId: "a", valorDevido: 47.9 }]);
  });

  it("mantém o total exato em centavos para vários valores e grupos", () => {
    const valores = [0.01, 0.02, 9.99, 10, 100.5, 123.45, 999.99, 1500.7];

    for (const valor of valores) {
      for (let n = 1; n <= 7; n++) {
        const ids = Array.from({ length: n }, (_, i) => `u${i}`);
        const divisao = dividirIgualmente(valor, ids);
        const soma = divisao.reduce((total, d) => total + centavos(d.valorDevido), 0);

        expect(soma).toBe(centavos(valor));
        expect(divisao.map((d) => d.usuarioId)).toEqual(ids);
      }
    }
  });

  it("nunca gera cota diferente em mais de um centavo entre participantes", () => {
    const divisao = dividirIgualmente(77.77, ["a", "b", "c", "d", "e", "f", "g"]);
    const valores = divisao.map((d) => centavos(d.valorDevido));

    expect(Math.max(...valores) - Math.min(...valores)).toBeLessThanOrEqual(1);
  });
});
