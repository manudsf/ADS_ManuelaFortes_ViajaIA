-- DropForeignKey
ALTER TABLE "historico_despesa" DROP CONSTRAINT "historico_despesa_despesa_id_fkey";

-- AlterTable
ALTER TABLE "historico_despesa" ALTER COLUMN "despesa_id" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "historico_despesa" ADD CONSTRAINT "historico_despesa_despesa_id_fkey" FOREIGN KEY ("despesa_id") REFERENCES "despesa"("id") ON DELETE SET NULL ON UPDATE CASCADE;
