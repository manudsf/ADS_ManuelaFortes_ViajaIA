-- AlterEnum
ALTER TYPE "TipoItemRoteiro" ADD VALUE 'RESTAURANTE';

-- AlterTable
ALTER TABLE "item_roteiro" ADD COLUMN     "periodo" TEXT,
ADD COLUMN     "valor" DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "roteiro" ADD COLUMN     "resumo" JSONB;
