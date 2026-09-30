import { prisma } from "../db.js";

export async function criarViagem({ nome, dataInicio, dataFim, criadoPorId }) {
  const viagem = await prisma.viagem.create({
    data: {
      nome,
      dataInicio: dataInicio ? new Date(dataInicio) : null,
      dataFim: dataFim ? new Date(dataFim) : null,
      criadoPorId,
      participantes: {
        create: {
          usuarioId: criadoPorId,
          papel: "ADMIN",
          statusConvite: "ACEITO",
        },
      },
    },
    include: {
      participantes: true,
    },
  });

  return viagem;
}