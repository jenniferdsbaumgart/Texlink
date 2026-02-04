-- AlterTable
ALTER TABLE "orders" ADD COLUMN "protectTechnicalSheet" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "credential_settings" ADD COLUMN "defaultProtectTechnicalSheet" BOOLEAN NOT NULL DEFAULT false;
