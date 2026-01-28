-- CreateEnum
CREATE TYPE "SupplierCredentialStatus" AS ENUM ('DRAFT', 'PENDING_VALIDATION', 'VALIDATING', 'VALIDATION_FAILED', 'PENDING_COMPLIANCE', 'COMPLIANCE_APPROVED', 'COMPLIANCE_REJECTED', 'INVITATION_PENDING', 'INVITATION_SENT', 'INVITATION_OPENED', 'INVITATION_EXPIRED', 'ONBOARDING_STARTED', 'ONBOARDING_IN_PROGRESS', 'CONTRACT_PENDING', 'CONTRACT_SIGNED', 'ACTIVE', 'SUSPENDED', 'BLOCKED');

-- CreateEnum
CREATE TYPE "ValidationSource" AS ENUM ('RECEITA_FEDERAL', 'SINTEGRA', 'SERASA', 'SPC', 'MANUAL', 'OTHER');

-- CreateEnum
CREATE TYPE "RiskLevel" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "ManualReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "InvitationType" AS ENUM ('EMAIL', 'WHATSAPP', 'SMS', 'LINK');

-- CreateEnum
CREATE TYPE "ContractStatus" AS ENUM ('DRAFT', 'PENDING_BRAND_SIGNATURE', 'PENDING_SUPPLIER_SIGNATURE', 'SIGNED', 'EXPIRED', 'CANCELLED');

-- CreateTable
CREATE TABLE "supplier_credentials" (
    "id" TEXT NOT NULL,
    "brandId" TEXT NOT NULL,
    "supplierId" TEXT,
    "createdById" TEXT NOT NULL,
    "cnpj" TEXT NOT NULL,
    "tradeName" TEXT,
    "legalName" TEXT,
    "contactName" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "contactWhatsapp" TEXT,
    "addressStreet" TEXT,
    "addressNumber" TEXT,
    "addressComplement" TEXT,
    "addressNeighborhood" TEXT,
    "addressCity" TEXT,
    "addressState" TEXT,
    "addressZipCode" TEXT,
    "internalCode" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "priority" INTEGER NOT NULL DEFAULT 0,
    "status" "SupplierCredentialStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "expiresAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "supplier_credentials_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_status_history" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "fromStatus" "SupplierCredentialStatus",
    "toStatus" "SupplierCredentialStatus" NOT NULL,
    "reason" TEXT,
    "metadata" JSONB,
    "performedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_status_history_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_validations" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "source" "ValidationSource" NOT NULL,
    "type" TEXT,
    "isValid" BOOLEAN,
    "score" INTEGER,
    "rawResponse" JSONB,
    "parsedData" JSONB,
    "companyStatus" TEXT,
    "companyType" TEXT,
    "mainActivity" TEXT,
    "secondaryActivities" TEXT[],
    "foundedAt" TIMESTAMP(3),
    "capitalStock" DECIMAL(15,2),
    "partnerNames" TEXT[],
    "errorMessage" TEXT,
    "retryCount" INTEGER NOT NULL DEFAULT 0,
    "validatedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_validations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "compliance_analyses" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "overallScore" INTEGER,
    "creditScore" INTEGER,
    "taxScore" INTEGER,
    "legalScore" INTEGER,
    "riskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "riskFactors" JSONB,
    "hasActiveCNPJ" BOOLEAN NOT NULL DEFAULT false,
    "hasRegularTaxStatus" BOOLEAN NOT NULL DEFAULT false,
    "hasNegativeCredit" BOOLEAN NOT NULL DEFAULT false,
    "hasLegalIssues" BOOLEAN NOT NULL DEFAULT false,
    "hasRelatedRestrictions" BOOLEAN NOT NULL DEFAULT false,
    "recommendation" TEXT,
    "recommendationReason" TEXT,
    "requiresManualReview" BOOLEAN NOT NULL DEFAULT false,
    "manualReviewStatus" "ManualReviewStatus",
    "manualReviewNotes" TEXT,
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "compliance_analyses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_invitations" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "recipient" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "subject" TEXT,
    "message" TEXT,
    "templateId" TEXT,
    "sentAt" TIMESTAMP(3),
    "deliveredAt" TIMESTAMP(3),
    "openedAt" TIMESTAMP(3),
    "clickedAt" TIMESTAMP(3),
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "respondedAt" TIMESTAMP(3),
    "response" TEXT,
    "attemptCount" INTEGER NOT NULL DEFAULT 0,
    "lastAttemptAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "providerMessageId" TEXT,
    "providerResponse" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "credential_invitations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_onboardings" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "userId" TEXT,
    "currentStep" INTEGER NOT NULL DEFAULT 1,
    "totalSteps" INTEGER NOT NULL DEFAULT 6,
    "completedSteps" JSONB,
    "emailVerifiedAt" TIMESTAMP(3),
    "passwordCreatedAt" TIMESTAMP(3),
    "companyDataCompletedAt" TIMESTAMP(3),
    "documentsUploadedAt" TIMESTAMP(3),
    "capabilitiesCompletedAt" TIMESTAMP(3),
    "contractCompletedAt" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "abandonedAt" TIMESTAMP(3),
    "lastActivityAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "timeSpentSeconds" INTEGER NOT NULL DEFAULT 0,
    "deviceInfo" JSONB,

    CONSTRAINT "supplier_onboardings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "onboarding_documents" (
    "id" TEXT NOT NULL,
    "onboardingId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "fileName" TEXT NOT NULL,
    "fileUrl" TEXT NOT NULL,
    "fileSize" INTEGER NOT NULL,
    "mimeType" TEXT NOT NULL,
    "isValid" BOOLEAN,
    "validationNotes" TEXT,
    "validatedById" TEXT,
    "validatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "onboarding_documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "supplier_contracts" (
    "id" TEXT NOT NULL,
    "credentialId" TEXT NOT NULL,
    "templateId" TEXT,
    "templateVersion" TEXT,
    "documentUrl" TEXT,
    "documentHash" TEXT,
    "terms" JSONB,
    "brandSignedAt" TIMESTAMP(3),
    "brandSignedById" TEXT,
    "brandSignatureIp" TEXT,
    "supplierSignedAt" TIMESTAMP(3),
    "supplierSignedById" TEXT,
    "supplierSignatureIp" TEXT,
    "externalSignatureId" TEXT,
    "externalSignatureUrl" TEXT,
    "externalStatus" TEXT,
    "status" "ContractStatus" NOT NULL DEFAULT 'DRAFT',
    "validFrom" TIMESTAMP(3),
    "validUntil" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_contracts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invitation_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "type" "InvitationType" NOT NULL,
    "subject" TEXT,
    "content" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "invitation_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contract_templates" (
    "id" TEXT NOT NULL,
    "companyId" TEXT,
    "name" TEXT NOT NULL,
    "version" TEXT NOT NULL DEFAULT '1.0',
    "content" TEXT NOT NULL,
    "variables" JSONB,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "contract_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "credential_settings" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "autoValidateCNPJ" BOOLEAN NOT NULL DEFAULT true,
    "autoCheckCredit" BOOLEAN NOT NULL DEFAULT true,
    "autoCheckCompliance" BOOLEAN NOT NULL DEFAULT true,
    "minCreditScore" INTEGER,
    "maxRiskLevel" "RiskLevel" NOT NULL DEFAULT 'MEDIUM',
    "defaultInvitationType" "InvitationType" NOT NULL DEFAULT 'EMAIL',
    "invitationExpiryDays" INTEGER NOT NULL DEFAULT 7,
    "maxInvitationAttempts" INTEGER NOT NULL DEFAULT 3,
    "requiredDocuments" TEXT[],
    "requireContract" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnNewCredential" BOOLEAN NOT NULL DEFAULT true,
    "notifyOnStatusChange" BOOLEAN NOT NULL DEFAULT true,
    "notificationEmails" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "credential_settings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_credentials_brandId_idx" ON "supplier_credentials"("brandId");

-- CreateIndex
CREATE INDEX "supplier_credentials_cnpj_idx" ON "supplier_credentials"("cnpj");

-- CreateIndex
CREATE INDEX "supplier_credentials_status_idx" ON "supplier_credentials"("status");

-- CreateIndex
CREATE INDEX "supplier_credentials_createdAt_idx" ON "supplier_credentials"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_credentials_brandId_cnpj_key" ON "supplier_credentials"("brandId", "cnpj");

-- CreateIndex
CREATE INDEX "credential_status_history_credentialId_idx" ON "credential_status_history"("credentialId");

-- CreateIndex
CREATE INDEX "credential_validations_credentialId_idx" ON "credential_validations"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "compliance_analyses_credentialId_key" ON "compliance_analyses"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "credential_invitations_token_key" ON "credential_invitations"("token");

-- CreateIndex
CREATE INDEX "credential_invitations_credentialId_idx" ON "credential_invitations"("credentialId");

-- CreateIndex
CREATE INDEX "credential_invitations_token_idx" ON "credential_invitations"("token");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_onboardings_credentialId_key" ON "supplier_onboardings"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "supplier_contracts_credentialId_key" ON "supplier_contracts"("credentialId");

-- CreateIndex
CREATE UNIQUE INDEX "credential_settings_companyId_key" ON "credential_settings"("companyId");

-- AddForeignKey
ALTER TABLE "supplier_credentials" ADD CONSTRAINT "supplier_credentials_brandId_fkey" FOREIGN KEY ("brandId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credentials" ADD CONSTRAINT "supplier_credentials_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_credentials" ADD CONSTRAINT "supplier_credentials_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_status_history" ADD CONSTRAINT "credential_status_history_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_status_history" ADD CONSTRAINT "credential_status_history_performedById_fkey" FOREIGN KEY ("performedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_validations" ADD CONSTRAINT "credential_validations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_analyses" ADD CONSTRAINT "compliance_analyses_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "compliance_analyses" ADD CONSTRAINT "compliance_analyses_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_invitations" ADD CONSTRAINT "credential_invitations_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_onboardings" ADD CONSTRAINT "supplier_onboardings_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_onboardings" ADD CONSTRAINT "supplier_onboardings_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_onboardingId_fkey" FOREIGN KEY ("onboardingId") REFERENCES "supplier_onboardings"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "onboarding_documents" ADD CONSTRAINT "onboarding_documents_validatedById_fkey" FOREIGN KEY ("validatedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contracts" ADD CONSTRAINT "supplier_contracts_credentialId_fkey" FOREIGN KEY ("credentialId") REFERENCES "supplier_credentials"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contracts" ADD CONSTRAINT "supplier_contracts_brandSignedById_fkey" FOREIGN KEY ("brandSignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_contracts" ADD CONSTRAINT "supplier_contracts_supplierSignedById_fkey" FOREIGN KEY ("supplierSignedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invitation_templates" ADD CONSTRAINT "invitation_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "contract_templates" ADD CONSTRAINT "contract_templates_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "credential_settings" ADD CONSTRAINT "credential_settings_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
