-- CreateTable
CREATE TABLE "convite_link" (
    "id" TEXT NOT NULL,
    "viagem_id" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "criado_por" TEXT NOT NULL,
    "expira_em" TIMESTAMP(3) NOT NULL,
    "criado_em" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "convite_link_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "convite_link_token_key" ON "convite_link"("token");

-- AddForeignKey
ALTER TABLE "convite_link" ADD CONSTRAINT "convite_link_viagem_id_fkey" FOREIGN KEY ("viagem_id") REFERENCES "viagem"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "convite_link" ADD CONSTRAINT "convite_link_criado_por_fkey" FOREIGN KEY ("criado_por") REFERENCES "usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
