-- CreateEnum
CREATE TYPE "AccountType" AS ENUM ('CORRENTE', 'POUPANCA');

-- CreateEnum
CREATE TYPE "PixKeyType" AS ENUM ('CPF', 'CNPJ', 'EMAIL', 'TELEFONE', 'ALEATORIA');

-- CreateEnum
CREATE TYPE "SuggestionCategory" AS ENUM ('FUNCIONALIDADE', 'USABILIDADE', 'BUG', 'PERFORMANCE', 'OUTRO');

-- CreateEnum
CREATE TYPE "SuggestionStatus" AS ENUM ('ENVIADO', 'EM_ANALISE', 'IMPLEMENTADO', 'REJEITADO');

-- AlterTable: Add address fields to Company
ALTER TABLE "companies" ADD COLUMN "street" TEXT;
ALTER TABLE "companies" ADD COLUMN "number" TEXT;
ALTER TABLE "companies" ADD COLUMN "complement" TEXT;
ALTER TABLE "companies" ADD COLUMN "neighborhood" TEXT;
ALTER TABLE "companies" ADD COLUMN "zipCode" TEXT;

-- AlterTable: Add passwordChangedAt to User
ALTER TABLE "users" ADD COLUMN "passwordChangedAt" TIMESTAMP(3);

-- CreateTable: BankAccount
CREATE TABLE "bank_accounts" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "bankCode" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "agency" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "accountType" "AccountType" NOT NULL DEFAULT 'CORRENTE',
    "accountHolder" TEXT NOT NULL,
    "holderDocument" TEXT NOT NULL,
    "pixKeyType" "PixKeyType",
    "pixKey" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateTable: NotificationSettings
CREATE TABLE "notification_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "emailEnabled" BOOLEAN NOT NULL DEFAULT true,
    "whatsappEnabled" BOOLEAN NOT NULL DEFAULT false,
    "newOrdersEmail" BOOLEAN NOT NULL DEFAULT true,
    "newOrdersWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "messagesEmail" BOOLEAN NOT NULL DEFAULT true,
    "messagesWhatsapp" BOOLEAN NOT NULL DEFAULT false,
    "paymentsEmail" BOOLEAN NOT NULL DEFAULT true,
    "paymentsWhatsapp" BOOLEAN NOT NULL DEFAULT true,
    "deadlineReminders" BOOLEAN NOT NULL DEFAULT true,
    "systemUpdates" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notification_settings_pkey" PRIMARY KEY ("id")
);

-- CreateTable: Suggestion
CREATE TABLE "suggestions" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "category" "SuggestionCategory" NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "SuggestionStatus" NOT NULL DEFAULT 'ENVIADO',
    "adminNotes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "suggestions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "bank_accounts_companyId_key" ON "bank_accounts"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "notification_settings_companyId_key" ON "notification_settings"("companyId");

-- CreateIndex
CREATE INDEX "suggestions_companyId_idx" ON "suggestions"("companyId");

-- AddForeignKey
ALTER TABLE "bank_accounts" ADD CONSTRAINT "bank_accounts_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notification_settings" ADD CONSTRAINT "notification_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "suggestions" ADD CONSTRAINT "suggestions_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
