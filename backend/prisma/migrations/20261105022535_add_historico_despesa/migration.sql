-- CreateTable
CREATE TABLE "historico_despesa" (
    "id" TEXT NOT NULL,
    "despesa_id" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "descricao" TEXT NOT NULL,
    "feito_por" TEXT NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "historico_despesa_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "historico_despesa" ADD CONSTRAINT "historico_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE CASCADE ON UPDATE CASCADE;
