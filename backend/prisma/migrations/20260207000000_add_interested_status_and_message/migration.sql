-- AlterEnum: Add INTERESTED to OrderTargetStatus
ALTER TYPE "OrderTargetStatus" ADD VALUE 'INTERESTED';

-- AlterTable: Add message column to order_target_suppliers
ALTER TABLE "order_target_suppliers" ADD COLUMN "message" TEXT;
