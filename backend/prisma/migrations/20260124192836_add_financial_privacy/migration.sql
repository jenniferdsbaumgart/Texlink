-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "netValue" DECIMAL(12,2),
ADD COLUMN     "platformFee" DECIMAL(10,2);
