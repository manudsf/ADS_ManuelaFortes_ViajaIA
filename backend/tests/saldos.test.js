import { describe, it, expect, vi, beforeEach } from "vitest";

vi.mock("../src/db.js", () => ({
  prisma: {
    participanteViagem: { findUnique: vi.fn(), findMany: vi.fn() },
    despesa: { findMany: vi.fn() },
  },
}));

const { prisma } = await import("../src/db.js");
const { calcularSaldos } = await import("../src/services/despesa.service.js");

const ana = { usuarioId: "ana", statusConvite: "ACEITO", usuario: { id: "ana", nome: "Ana" } };
const bia = { usuarioId: "bia", statusConvite: "ACEITO", usuario: { id: "bia", nome: "Bia" } };
const caio = { usuarioId: "caio", statusConvite: "ACEITO", usuario: { id: "caio", nome: "Caio" } };

beforeEach(() => {
  vi.clearAllMocks();
  prisma.participanteViagem.findUnique.mockResolvedValue({ statusConvite: "ACEITO" });
  prisma.participanteViagem.findMany.mockResolvedValue([ana, bia, caio]);
});

describe("calcularSaldos", () => {
  it("bloqueia quem não confirmou participação na viagem", async () => {
    prisma.participanteViagem.findUnique.mockResolvedValue(null);

    await expect(calcularSaldos({ viagemId: "v1", usuarioId: "x" })).rejects.toThrow(
      "PARTICIPANTE_NAO_CONFIRMADO"
    );
  });

  it("calcula saldos e sugere transferências mínimas entre o grupo", async () => {
    prisma.despesa.findMany.mockResolvedValue([
      {
        id: "d1",
        pagoPorId: "ana",
        valor: 90,
        participacoes: [
          { usuarioId: "ana", valorDevido: 30 },
          { usuarioId: "bia", valorDevido: 30 },
          { usuarioId: "caio", valorDevido: 30 },
        ],
      },
      {
        id: "d2",
        pagoPorId: "bia",
        valor: 30,
        participacoes: [
          { usuarioId: "bia", valorDevido: 15 },
          { usuarioId: "caio", valorDevido: 15 },
        ],
      },
    ]);

    const resultado = await calcularSaldos({ viagemId: "v1", usuarioId: "ana" });

    expect(resultado.totalGasto).toBe(120);
    expect(resultado.saldos).toEqual([
      { id: "ana", nome: "Ana", valor: 60 },
      { id: "bia", nome: "Bia", valor: -15 },
      { id: "caio", nome: "Caio", valor: -45 },
    ]);
    expect(resultado.transferencias).toEqual([
      { de: { id: "bia", nome: "Bia" }, para: { id: "ana", nome: "Ana" }, valor: 15 },
      { de: { id: "caio", nome: "Caio" }, para: { id: "ana", nome: "Ana" }, valor: 45 },
    ]);
  });

  it("não sugere transferências quando todos já estão quites", async () => {
    prisma.despesa.findMany.mockResolvedValue([
      {
        id: "d1",
        pagoPorId: "ana",
        valor: 60,
        participacoes: [
          { usuarioId: "ana", valorDevido: 30 },
          { usuarioId: "bia", valorDevido: 30 },
        ],
      },
      {
        id: "d2",
        pagoPorId: "bia",
        valor: 60,
        participacoes: [
          { usuarioId: "ana", valorDevido: 30 },
          { usuarioId: "bia", valorDevido: 30 },
        ],
      },
    ]);
    prisma.participanteViagem.findMany.mockResolvedValue([ana, bia]);

    const resultado = await calcularSaldos({ viagemId: "v1", usuarioId: "ana" });

    expect(resultado.saldos.map((s) => s.valor)).toEqual([0, 0]);
    expect(resultado.transferencias).toEqual([]);
  });

  it("zera o resultado quando não há despesas", async () => {
    prisma.despesa.findMany.mockResolvedValue([]);

    const resultado = await calcularSaldos({ viagemId: "v1", usuarioId: "ana" });

    expect(resultado.totalGasto).toBe(0);
    expect(resultado.transferencias).toEqual([]);
    expect(resultado.saldos.every((s) => s.valor === 0)).toBe(true);
  });
});
