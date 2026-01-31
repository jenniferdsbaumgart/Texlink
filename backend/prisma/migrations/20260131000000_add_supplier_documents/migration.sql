-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "SupplierDocumentType" AS ENUM (
        'ABVTEX_TERMO',
        'CNPJ_ATIVO',
        'CND_FEDERAL',
        'CRF_FGTS',
        'GUIA_INSS',
        'GUIA_FGTS',
        'GUIA_SIMPLES_DAS',
        'LICENCA_FUNCIONAMENTO',
        'AVCB',
        'CONTRATO_SOCIAL',
        'INSCRICAO_MUNICIPAL',
        'RELATORIO_EMPREGADOS',
        'RELACAO_SUBCONTRATADOS',
        'LICENCA_AMBIENTAL',
        'LAUDO_NR1_GRO_PGR',
        'LAUDO_NR7_PCMSO',
        'LAUDO_NR10_SEGURANCA_ELETRICA',
        'LAUDO_NR15_INSALUBRIDADE',
        'LAUDO_NR17_AET',
        'OUTRO'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateEnum (if not exists)
DO $$ BEGIN
    CREATE TYPE "SupplierDocumentStatus" AS ENUM (
        'PENDING',
        'VALID',
        'EXPIRING_SOON',
        'EXPIRED'
    );
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- CreateTable (if not exists)
CREATE TABLE IF NOT EXISTS "supplier_documents" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "type" "SupplierDocumentType" NOT NULL,
    "status" "SupplierDocumentStatus" NOT NULL DEFAULT 'PENDING',
    "fileName" TEXT,
    "fileUrl" TEXT,
    "fileSize" INTEGER,
    "mimeType" TEXT,
    "uploadedAt" TIMESTAMP(3),
    "competenceMonth" INTEGER,
    "competenceYear" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "notes" TEXT,
    "uploadedById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "supplier_documents_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_documents_companyId_idx" ON "supplier_documents"("companyId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_documents_type_idx" ON "supplier_documents"("type");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_documents_status_idx" ON "supplier_documents"("status");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "supplier_documents_expiresAt_idx" ON "supplier_documents"("expiresAt");

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- AddForeignKey (if not exists)
DO $$ BEGIN
    ALTER TABLE "supplier_documents" ADD CONSTRAINT "supplier_documents_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;
