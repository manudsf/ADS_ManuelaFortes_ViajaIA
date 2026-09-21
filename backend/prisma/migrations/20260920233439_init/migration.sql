-- CreateEnum
CREATE TYPE "Papel" AS ENUM ('ADMIN', 'MEMBRO');

-- CreateEnum
CREATE TYPE "StatusConvite" AS ENUM ('PENDENTE', 'ACEITO', 'RECUSADO');

-- CreateEnum
CREATE TYPE "StatusViagem" AS ENUM ('PLANEJAMENTO', 'DESTINO_DEFINIDO', 'ROTEIRO_PRONTO', 'EM_ANDAMENTO', 'CONCLUIDA');

-- CreateEnum
CREATE TYPE "RemetenteMensagem" AS ENUM ('USUARIO', 'AGENTE');

-- CreateEnum
CREATE TYPE "TipoItemRoteiro" AS ENUM ('HOSPEDAGEM', 'PONTO_TURISTICO', 'ATIVIDADE');

-- CreateTable
CREATE TABLE "usuario" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "senha_hash" TEXT NOT NULL,
    "telefone" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "usuario_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "viagem" (
    "id" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "status" "StatusViagem" NOT NULL DEFAULT 'PLANEJAMENTO',
    "data_inicio" TIMESTAMP(3),
    "data_fim" TIMESTAMP(3),
    "criado_por" TEXT NOT NULL,
    "destino_final" TEXT,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participante_viagem" (
    "id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "papel" "Papel" NOT NULL DEFAULT 'MEMBRO',
    "status_convite" "StatusConvite" NOT NULL DEFAULT 'PENDENTE',

    CONSTRAINT "participante_viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "preferencia_viagem" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "orcamento" DOUBLE PRECISION,
    "interesses" TEXT,
    "restricoes" TEXT,
    "resumo_estruturado" JSONB,

    CONSTRAINT "preferencia_viagem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "mensagem_agente" (
    "id" TEXT NOT NULL,
    "participante_id" TEXT NOT NULL,
    "remetente" "RemetenteMensagem" NOT NULL,
    "conteudo" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "mensagem_agente_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "destino_sugerido" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "nome_destino" TEXT NOT NULL,
    "descricao" TEXT,
    "gerado_por_ia" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "destino_sugerido_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voto_destino" (
    "id" TEXT NOT NULL,
    "destino_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "voto_destino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "roteiro" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "gerado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "roteiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_roteiro" (
    "id" TEXT NOT NULL,
    "roteiro_id" TEXT NOT NULL,
    "dia" INTEGER NOT NULL,
    "tipo" "TipoItemRoteiro" NOT NULL,
    "titulo" TEXT NOT NULL,
    "descricao" TEXT,
    "ordem" INTEGER NOT NULL,

    CONSTRAINT "item_roteiro_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "despesa" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "valor" DOUBLE PRECISION NOT NULL,
    "pago_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "despesa_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "participacao_despesa" (
    "id" TEXT NOT NULL,
    "despesa_id" TEXT NOT NULL,
    "usuario_id" TEXT NOT NULL,
    "valor_devido" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "participacao_despesa_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "usuario_email_key" ON "usuario"("email");

-- CreateIndex
CREATE UNIQUE INDEX "viagem_destino_final_key" ON "viagem"("destino_final");

-- CreateIndex
CREATE UNIQUE INDEX "participante_viagem_usuario_id_viagem_id_key" ON "participante_viagem"("usuario_id", "viagem_id");

-- CreateIndex
CREATE UNIQUE INDEX "preferencia_viagem_participante_id_key" ON "preferencia_viagem"("participante_id");

-- CreateIndex
CREATE UNIQUE INDEX "voto_destino_destino_id_usuario_id_key" ON "voto_destino"("destino_id", "usuario_id");

-- CreateIndex
CREATE UNIQUE INDEX "roteiro_viagem_id_key" ON "roteiro"("viagem_id");

-- CreateIndex
CREATE UNIQUE INDEX "participacao_despesa_despesa_id_usuario_id_key" ON "participacao_despesa"("despesa_id", "usuario_id");

-- AddForeignKey
ALTER TABLE "viagem" ADD CONSTRAINT "viagem_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "viagem" ADD CONSTRAINT "viagem_destino_final_fkey" FOREIGN KEY ("destino_final") REFERENCES "destino_sugerido"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_viagem" ADD CONSTRAINT "participante_viagem_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participante_viagem" ADD CONSTRAINT "participante_viagem_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "preferencia_viagem" ADD CONSTRAINT "preferencia_viagem_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participante_viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "mensagem_agente" ADD CONSTRAINT "mensagem_agente_participante_id_fkey" FOREIGN KEY ("participante_id") REFERENCES "participante_viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "destino_sugerido" ADD CONSTRAINT "destino_sugerido_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_destino" ADD CONSTRAINT "voto_destino_destino_id_fkey" FOREIGN KEY ("destino_id") REFERENCES "destino_sugerido"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voto_destino" ADD CONSTRAINT "voto_destino_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "roteiro" ADD CONSTRAINT "roteiro_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "item_roteiro" ADD CONSTRAINT "item_roteiro_roteiro_id_fkey" FOREIGN KEY ("roteiro_id") REFERENCES "roteiro"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "despesa" ADD CONSTRAINT "despesa_pago_por_fkey" FOREIGN KEY ("pago_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao_despesa" ADD CONSTRAINT "participacao_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "participacao_despesa" ADD CONSTRAINT "participacao_despesa_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
