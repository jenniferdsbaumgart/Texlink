# Plano V3: Facção com Múltiplas Marcas (N:M)

**Data:** 2026-01-28
**Objetivo:** Permitir que uma facção trabalhe para MÚLTIPLAS marcas simultaneamente
**Impacto:** Mudança arquitetural significativa (relação muitos-para-muitos)
**Estimativa:** 7-10 dias de implementação

---

## 🎯 Problema Identificado

### Modelo Atual (1:1)
```
SupplierCredential
├─ brandId: string          // Uma facção = Uma marca
├─ supplierId: string
├─ onboarding
├─ contract
└─ documents
```

**Limitação:** Facção só pode trabalhar para UMA marca.

### Novo Requisito (N:M)
```
Uma facção pode trabalhar para:
- Marca A (ativa)
- Marca B (ativa)
- Marca C (suspensa temporariamente)

Cada relação tem:
- Contrato separado
- Status independente
- Documentos específicos (opcional)
```

---

## 🏗️ Nova Arquitetura Proposta

### Conceito: "Facção Global + Relacionamentos por Marca"

```
Supplier (Company)                    # Facção em si
├─ SupplierProfile                    # Dados gerais
├─ SupplierOnboarding                 # Onboarding GERAL (feito 1 vez)
│  ├─ documents (gerais)              # Alvará, Bombeiros, etc
│  └─ completedAt
└─ SupplierBrandRelationships (N)    # Relacionamentos com marcas
   ├─ Relationship 1: Marca A
   │  ├─ status: ACTIVE
   │  ├─ contract: Contrato A-Supplier
   │  ├─ specificDocuments?: []
   │  └─ settings
   ├─ Relationship 2: Marca B
   │  ├─ status: ACTIVE
   │  ├─ contract: Contrato B-Supplier
   │  └─ settings
   └─ Relationship 3: Marca C
      ├─ status: SUSPENDED
      └─ contract: Contrato C-Supplier
```

---

## 📊 Novos Modelos de Dados

### 1. SupplierOnboarding (Modificar - Desacoplar de Brand)

**Antes:**
```prisma
model SupplierOnboarding {
  id            String @id @default(uuid())
  credentialId  String @unique  // ← Vinculado a credential (que tem brandId)
  // ...
}
```

**Depois:**
```prisma
model SupplierOnboarding {
  id          String  @id @default(uuid())
  supplierId  String  @unique  // ← Vinculado diretamente ao supplier

  // Onboarding geral (sem marca específica)
  currentStep       Int      @default(1)
  completedSteps    Int[]
  isCompleted       Boolean  @default(false)
  completedAt       DateTime?

  // Dados preenchidos no onboarding
  passwordSet       Boolean  @default(false)
  emailVerified     Boolean  @default(false)
  dataCompleted     Boolean  @default(false)
  documentsUploaded Boolean  @default(false)
  capabilitiesSet   Boolean  @default(false)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  supplier  Company              @relation("SupplierOnboarding", fields: [supplierId], references: [id], onDelete: Cascade)
  documents OnboardingDocument[]

  @@map("supplier_onboardings")
}
```

**Mudança chave:** Onboarding agora é **por supplier**, não por credential.

### 2. SupplierBrandRelationship (CRIAR NOVO)

```prisma
model SupplierBrandRelationship {
  id         String @id @default(uuid())
  supplierId String
  brandId    String

  // Status do relacionamento com ESTA marca
  status RelationshipStatus @default(PENDING)

  // Quem iniciou/gerencia
  initiatedBy       String  // User ID (admin ou marca)
  initiatedByRole   UserRole
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt
  activatedAt       DateTime?
  suspendedAt       DateTime?
  terminatedAt      DateTime?

  // Observações específicas desta relação
  internalCode String? // Código interno da marca para este fornecedor
  notes        String? // Notas da marca sobre este fornecedor
  priority     Int     @default(0)

  // Relations
  supplier Company @relation("SupplierRelationships", fields: [supplierId], references: [id], onDelete: Cascade)
  brand    Company @relation("BrandSuppliers", fields: [brandId], references: [id], onDelete: Cascade)

  contract              SupplierContract?
  specificDocuments     BrandSpecificDocument[]
  statusHistory         RelationshipStatusHistory[]
  orders                Order[]

  @@unique([supplierId, brandId]) // Uma facção pode ter apenas UM relacionamento por marca
  @@index([supplierId])
  @@index([brandId])
  @@index([status])
  @@map("supplier_brand_relationships")
}

enum RelationshipStatus {
  PENDING              // Aguardando ativação
  CONTRACT_PENDING     // Aguardando assinatura de contrato
  ACTIVE               // Ativo
  SUSPENDED            // Suspenso temporariamente (por marca ou admin)
  TERMINATED           // Encerrado permanentemente
}
```

### 3. SupplierContract (Modificar)

**Antes:**
```prisma
model SupplierContract {
  id           String @id @default(uuid())
  credentialId String @unique  // ← Um contrato por credential
  // ...
}
```

**Depois:**
```prisma
model SupplierContract {
  id             String @id @default(uuid())
  relationshipId String @unique  // ← Um contrato por relacionamento marca-facção

  // Referências diretas (desnormalizado para performance)
  supplierId String
  brandId    String

  // Template e dados
  templateId      String?
  templateVersion String?
  documentUrl     String
  documentHash    String

  // Termos personalizados para ESTA marca
  terms Json?

  // Assinaturas
  brandSignedAt         DateTime?
  brandSignedBy         String?
  brandSignatureIp      String?

  supplierSignedAt      DateTime?
  supplierSignedBy      String?
  supplierSignatureIp   String?

  status       ContractStatus @default(DRAFT)
  expiresAt    DateTime?
  createdAt    DateTime       @default(now())
  updatedAt    DateTime       @updatedAt

  // Relations
  relationship SupplierBrandRelationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  supplier     Company                    @relation("SupplierContracts", fields: [supplierId], references: [id])
  brand        Company                    @relation("BrandContracts", fields: [brandId], references: [id])

  @@map("supplier_contracts")
}
```

### 4. BrandSpecificDocument (CRIAR NOVO - Opcional)

```prisma
model BrandSpecificDocument {
  id             String @id @default(uuid())
  relationshipId String

  // Tipo de documento específico desta marca
  type        String  // ex: "certificado_qualidade_marca_x"
  name        String
  description String?
  isRequired  Boolean @default(false)

  // Arquivo
  fileName String
  fileUrl  String
  fileSize Int
  mimeType String

  // Validação pela marca
  isValid          Boolean?
  validationNotes  String?
  validatedAt      DateTime?
  validatedById    String?

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  relationship SupplierBrandRelationship @relation(fields: [relationshipId], references: [id], onDelete: Cascade)
  validatedBy  User?                      @relation("BrandDocumentsValidated", fields: [validatedById], references: [id])

  @@map("brand_specific_documents")
}
```

### 5. Remover/Deprecar SupplierCredential (?)

**Opção A: Remover completamente**
- Migrar dados existentes para novo modelo
- Substituir por SupplierBrandRelationship

**Opção B: Manter como "processo de credenciamento inicial"**
- SupplierCredential = processo administrativo de adicionar facção
- Depois de aprovado, cria SupplierBrandRelationship
- Mantém histórico de como facção entrou

**RECOMENDAÇÃO:** Opção B (manter para histórico e processo inicial)

---

## 🔄 Fluxos Revisados

### Fluxo 1: Admin adiciona facção ao Pool Global

```
1. Admin → Criar Facção (sem marca)
   └─ Cria: Supplier (Company) + SupplierOnboarding

2. Admin → Envia convite onboarding
   └─ Facção completa 6 steps (geral, sem marca)
   └─ Marca: SupplierOnboarding.isCompleted = true

3. Facção está no "pool" (onboarding completo, sem marca)
   └─ Status global: ONBOARDED / AVAILABLE
```

### Fluxo 2: Marca credencia facção do Pool

```
1. Marca → Ver Pool de Facções Disponíveis
   └─ Lista: Suppliers com onboarding completo, não vinculados a ela

2. Marca → "Credenciar Facção X"
   └─ Cria: SupplierBrandRelationship
   └─ Status: CONTRACT_PENDING

3. Sistema → Gera contrato Marca-Facção
   └─ Cria: SupplierContract (relationshipId)

4. Facção → Assina contrato específico desta marca
   └─ Atualiza: SupplierContract.supplierSignedAt
   └─ Atualiza: Relationship.status = ACTIVE

5. Marca pode começar a criar pedidos
```

### Fluxo 3: Admin adiciona facção para Marca específica

```
1. Admin → Criar Facção PARA Marca A
   └─ Cria: Supplier + SupplierOnboarding
   └─ Cria: SupplierBrandRelationship (Marca A)

2. Admin/Marca → Envia convite onboarding
   └─ Facção completa onboarding geral

3. Sistema → Gera contrato Marca A - Facção

4. Facção → Assina contrato
   └─ Relationship status = ACTIVE

5. Marca A pode usar facção

6. DEPOIS: Marca B pode credenciar mesma facção
   └─ Cria novo SupplierBrandRelationship (Marca B)
   └─ Novo contrato Marca B - Facção
   └─ Facção assina
   └─ Agora trabalha para A e B simultaneamente
```

### Fluxo 4: Marca credencia facção diretamente

```
1. Marca A → Adicionar Novo Fornecedor
   └─ Busca por CNPJ

2. Sistema verifica:
   a) CNPJ não existe → Criar novo Supplier + Onboarding + Relationship
   b) CNPJ existe (já onboarded) → Apenas criar Relationship
   c) CNPJ existe + já tem Relationship com esta marca → Erro

3. Se novo:
   └─ Envia convite onboarding
   └─ Facção completa
   └─ Gera contrato
   └─ Assina
   └─ ACTIVE

4. Se já existe:
   └─ Gera contrato (onboarding JÁ foi feito)
   └─ Facção assina
   └─ ACTIVE
```

---

## 📋 Mudanças de Implementação

### Backend - Migration Complexa

**Arquivo:** `backend/prisma/migrations/XXX_multi_brand_relationships.sql`

```sql
-- 1. Criar novo modelo SupplierBrandRelationship
CREATE TABLE "supplier_brand_relationships" (
  "id" TEXT PRIMARY KEY,
  "supplierId" TEXT NOT NULL,
  "brandId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "initiatedBy" TEXT NOT NULL,
  "initiatedByRole" TEXT NOT NULL,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now(),
  "updatedAt" TIMESTAMP NOT NULL,
  "activatedAt" TIMESTAMP,
  "suspendedAt" TIMESTAMP,
  "terminatedAt" TIMESTAMP,
  "internalCode" TEXT,
  "notes" TEXT,
  "priority" INTEGER DEFAULT 0,
  CONSTRAINT "fk_supplier" FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "fk_brand" FOREIGN KEY ("brandId") REFERENCES "companies"("id") ON DELETE CASCADE,
  CONSTRAINT "unique_supplier_brand" UNIQUE ("supplierId", "brandId")
);

-- 2. Modificar SupplierOnboarding (remover credentialId, adicionar supplierId)
ALTER TABLE "supplier_onboardings" ADD COLUMN "supplierId" TEXT;

-- Migrar dados: credentialId → supplierId
UPDATE "supplier_onboardings" so
SET "supplierId" = (
  SELECT "supplierId"
  FROM "supplier_credentials" sc
  WHERE sc."id" = so."credentialId"
)
WHERE "supplierId" IS NULL;

ALTER TABLE "supplier_onboardings" ALTER COLUMN "supplierId" SET NOT NULL;
ALTER TABLE "supplier_onboardings" ADD CONSTRAINT "fk_supplier_onboarding"
  FOREIGN KEY ("supplierId") REFERENCES "companies"("id") ON DELETE CASCADE;

-- 3. Modificar SupplierContract (adicionar relationshipId)
ALTER TABLE "supplier_contracts" ADD COLUMN "relationshipId" TEXT;
ALTER TABLE "supplier_contracts" ADD COLUMN "supplierId" TEXT;
ALTER TABLE "supplier_contracts" ADD COLUMN "brandId" TEXT;

-- Migrar dados existentes: criar relationships para contratos atuais
INSERT INTO "supplier_brand_relationships"
  ("id", "supplierId", "brandId", "status", "initiatedBy", "initiatedByRole", "createdAt", "updatedAt")
SELECT
  gen_random_uuid(),
  sc."supplierId",
  cred."brandId",
  CASE
    WHEN cont."supplierSignedAt" IS NOT NULL THEN 'ACTIVE'
    ELSE 'CONTRACT_PENDING'
  END,
  cred."createdById",
  'BRAND', -- Assumir que foi criado por marca
  cred."createdAt",
  cred."updatedAt"
FROM "supplier_contracts" cont
JOIN "supplier_credentials" cred ON cont."credentialId" = cred."id"
WHERE cont."relationshipId" IS NULL;

-- Atualizar contracts com relationshipId
UPDATE "supplier_contracts" cont
SET
  "relationshipId" = rel."id",
  "supplierId" = rel."supplierId",
  "brandId" = rel."brandId"
FROM "supplier_credentials" cred
JOIN "supplier_brand_relationships" rel ON rel."supplierId" = cred."supplierId" AND rel."brandId" = cred."brandId"
WHERE cont."credentialId" = cred."id";

-- 4. Adicionar constraints
ALTER TABLE "supplier_contracts" ALTER COLUMN "relationshipId" SET NOT NULL;
ALTER TABLE "supplier_contracts" ADD CONSTRAINT "unique_contract_relationship" UNIQUE ("relationshipId");

-- 5. (OPCIONAL) Deprecar supplier_credentials ou manter para histórico
-- Por ora, manter a tabela mas adicionar flag "migrated"
ALTER TABLE "supplier_credentials" ADD COLUMN "migratedToRelationship" BOOLEAN DEFAULT false;
```

### Backend - Services

#### Novo: RelationshipsService

**Arquivo:** `backend/src/modules/relationships/relationships.service.ts` (CRIAR)

```typescript
@Injectable()
export class RelationshipsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Criar relacionamento entre facção e marca
   * (Marca credencia facção existente)
   */
  async create(
    supplierId: string,
    brandId: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== brandId) {
      throw new ForbiddenException('Você só pode credenciar fornecedores para sua própria marca');
    }
    if (user.role !== UserRole.ADMIN && user.role !== UserRole.BRAND) {
      throw new ForbiddenException('Apenas admin ou marca podem criar relacionamentos');
    }

    // Verificar que supplier existe e completou onboarding
    const supplier = await this.prisma.company.findUnique({
      where: { id: supplierId },
      include: {
        supplierProfile: true,
        onboarding: true,
      }
    });

    if (!supplier || supplier.type !== CompanyType.SUPPLIER) {
      throw new NotFoundException('Fornecedor não encontrado');
    }

    if (!supplier.onboarding?.isCompleted) {
      throw new BadRequestException('Fornecedor ainda não completou o onboarding');
    }

    // Verificar que brand existe
    const brand = await this.prisma.company.findUnique({
      where: { id: brandId }
    });

    if (!brand) {
      throw new NotFoundException('Marca não encontrada');
    }

    // Verificar que relacionamento não existe
    const existing = await this.prisma.supplierBrandRelationship.findUnique({
      where: {
        supplierId_brandId: { supplierId, brandId }
      }
    });

    if (existing) {
      throw new ConflictException('Já existe um relacionamento entre esta facção e marca');
    }

    // Criar relacionamento
    const relationship = await this.prisma.supplierBrandRelationship.create({
      data: {
        supplierId,
        brandId,
        status: RelationshipStatus.CONTRACT_PENDING,
        initiatedBy: user.id,
        initiatedByRole: user.role,
      },
      include: {
        supplier: true,
        brand: true,
      }
    });

    // Criar histórico
    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationship.id,
        status: RelationshipStatus.CONTRACT_PENDING,
        changedById: user.id,
        notes: `Relacionamento criado por ${user.name} (${user.role})`,
      }
    });

    // TODO: Gerar contrato automaticamente
    // await this.contractsService.generateForRelationship(relationship.id);

    return relationship;
  }

  /**
   * Listar relacionamentos da marca
   * (Fornecedores credenciados para a marca)
   */
  async findByBrand(brandId: string, user: AuthUser): Promise<SupplierBrandRelationship[]> {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== brandId) {
      throw new ForbiddenException('Você só pode ver fornecedores da sua própria marca');
    }

    return this.prisma.supplierBrandRelationship.findMany({
      where: { brandId },
      include: {
        supplier: {
          include: {
            supplierProfile: true,
            onboarding: true,
          }
        },
        contract: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Listar relacionamentos do fornecedor
   * (Marcas para as quais o fornecedor trabalha)
   */
  async findBySupplier(supplierId: string, user: AuthUser): Promise<SupplierBrandRelationship[]> {
    // Verificar permissão
    if (user.role === UserRole.SUPPLIER && user.supplierId !== supplierId) {
      throw new ForbiddenException('Você só pode ver seus próprios relacionamentos');
    }

    return this.prisma.supplierBrandRelationship.findMany({
      where: { supplierId },
      include: {
        brand: true,
        contract: true,
      },
      orderBy: { createdAt: 'desc' }
    });
  }

  /**
   * Listar facções disponíveis para marca credenciar
   * (Facções com onboarding completo, sem relacionamento com esta marca)
   */
  async findAvailableForBrand(brandId: string, user: AuthUser): Promise<Company[]> {
    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== brandId) {
      throw new ForbiddenException();
    }

    // Buscar IDs de suppliers já credenciados para esta marca
    const existingRelationships = await this.prisma.supplierBrandRelationship.findMany({
      where: { brandId },
      select: { supplierId: true }
    });

    const existingSupplierIds = existingRelationships.map(r => r.supplierId);

    // Buscar suppliers com onboarding completo, excluindo os já credenciados
    return this.prisma.company.findMany({
      where: {
        type: CompanyType.SUPPLIER,
        onboarding: {
          isCompleted: true,
        },
        id: {
          notIn: existingSupplierIds,
        }
      },
      include: {
        supplierProfile: true,
        onboarding: {
          include: {
            documents: true,
          }
        }
      },
      orderBy: { tradeName: 'asc' }
    });
  }

  /**
   * Ativar relacionamento (após contrato assinado)
   */
  async activate(relationshipId: string, user: AuthUser): Promise<SupplierBrandRelationship> {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId },
      include: { contract: true }
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== relationship.brandId) {
      throw new ForbiddenException();
    }

    // Verificar que contrato foi assinado
    if (!relationship.contract?.supplierSignedAt) {
      throw new BadRequestException('Contrato ainda não foi assinado pelo fornecedor');
    }

    // Ativar
    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.ACTIVE,
        activatedAt: new Date(),
      },
      include: {
        supplier: true,
        brand: true,
        contract: true,
      }
    });

    // Criar histórico
    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.ACTIVE,
        changedById: user.id,
        notes: 'Relacionamento ativado após assinatura do contrato',
      }
    });

    return updated;
  }

  /**
   * Suspender relacionamento
   */
  async suspend(
    relationshipId: string,
    reason: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId }
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== relationship.brandId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.SUSPENDED,
        suspendedAt: new Date(),
      }
    });

    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.SUSPENDED,
        changedById: user.id,
        notes: `Suspenso: ${reason}`,
      }
    });

    return updated;
  }

  /**
   * Encerrar relacionamento (permanente)
   */
  async terminate(
    relationshipId: string,
    reason: string,
    user: AuthUser,
  ): Promise<SupplierBrandRelationship> {
    const relationship = await this.prisma.supplierBrandRelationship.findUnique({
      where: { id: relationshipId }
    });

    if (!relationship) {
      throw new NotFoundException('Relacionamento não encontrado');
    }

    // Verificar permissão
    if (user.role === UserRole.BRAND && user.brandId !== relationship.brandId) {
      throw new ForbiddenException();
    }

    const updated = await this.prisma.supplierBrandRelationship.update({
      where: { id: relationshipId },
      data: {
        status: RelationshipStatus.TERMINATED,
        terminatedAt: new Date(),
      }
    });

    await this.prisma.relationshipStatusHistory.create({
      data: {
        relationshipId: relationshipId,
        status: RelationshipStatus.TERMINATED,
        changedById: user.id,
        notes: `Encerrado: ${reason}`,
      }
    });

    return updated;
  }
}
```

---

## 📋 Frontend - Novas Páginas

### 1. BrandSuppliersPage (Marca)

**Arquivo:** `src/pages/brand/suppliers/BrandSuppliersPage.tsx` (CRIAR)

```typescript
/**
 * Dashboard de fornecedores credenciados da marca
 *
 * Lista os relacionamentos (SupplierBrandRelationship)
 * da marca autenticada
 */
export function BrandSuppliersPage() {
  const [relationships, setRelationships] = useState<SupplierBrandRelationship[]>([]);

  // Listar meus fornecedores
  useEffect(() => {
    relationshipsService.getMySuppliers().then(setRelationships);
  }, []);

  return (
    <div>
      <h1>Meus Fornecedores</h1>

      <button onClick={() => navigate('/brand/suppliers/add')}>
        Credenciar Novo Fornecedor
      </button>

      <table>
        {relationships.map(rel => (
          <tr key={rel.id}>
            <td>{rel.supplier.tradeName}</td>
            <td>{rel.supplier.document}</td>
            <td><StatusBadge status={rel.status} /></td>
            <td>{rel.contract?.supplierSignedAt ? 'Assinado' : 'Pendente'}</td>
            <td>
              <button>Ver Detalhes</button>
              <button>Suspender</button>
            </td>
          </tr>
        ))}
      </table>
    </div>
  );
}
```

### 2. AddSupplierPage (Marca)

**Arquivo:** `src/pages/brand/suppliers/AddSupplierPage.tsx` (CRIAR)

```typescript
/**
 * Página para marca credenciar fornecedor
 *
 * 2 opções:
 * 1. Criar novo fornecedor (CNPJ novo)
 * 2. Credenciar fornecedor existente (do pool)
 */
export function AddSupplierPage() {
  const [tab, setTab] = useState<'new' | 'existing'>('new');
  const [availableSuppliers, setAvailableSuppliers] = useState<Company[]>([]);

  useEffect(() => {
    if (tab === 'existing') {
      relationshipsService.getAvailableSuppliers().then(setAvailableSuppliers);
    }
  }, [tab]);

  return (
    <div>
      <h1>Credenciar Fornecedor</h1>

      <Tabs value={tab} onChange={setTab}>
        <Tab value="new">Novo Fornecedor</Tab>
        <Tab value="existing">Do Pool (Já Cadastrados)</Tab>
      </Tabs>

      {tab === 'new' && (
        <div>
          <h2>Criar Novo Fornecedor</h2>
          <p>Facção será criada e receberá convite de onboarding</p>
          <CreateSupplierForm />
        </div>
      )}

      {tab === 'existing' && (
        <div>
          <h2>Credenciar Facção Existente</h2>
          <p>Facções já onboarded, disponíveis para credenciamento</p>

          {availableSuppliers.length === 0 ? (
            <p>Nenhuma facção disponível no pool</p>
          ) : (
            <div className="grid">
              {availableSuppliers.map(supplier => (
                <SupplierCard
                  key={supplier.id}
                  supplier={supplier}
                  onCredential={() => handleCredential(supplier.id)}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
```

### 3. SupplierBrandsPage (Facção)

**Arquivo:** `src/pages/supplier/brands/SupplierBrandsPage.tsx` (CRIAR)

```typescript
/**
 * Dashboard da facção mostrando marcas para as quais trabalha
 */
export function SupplierBrandsPage() {
  const [relationships, setRelationships] = useState<SupplierBrandRelationship[]>([]);

  useEffect(() => {
    relationshipsService.getMyBrands().then(setRelationships);
  }, []);

  return (
    <div>
      <h1>Minhas Marcas</h1>
      <p>Você trabalha atualmente para {relationships.filter(r => r.status === 'ACTIVE').length} marca(s)</p>

      <div className="grid">
        {relationships.map(rel => (
          <div key={rel.id} className="card">
            <h3>{rel.brand.tradeName}</h3>
            <StatusBadge status={rel.status} />

            {rel.status === 'CONTRACT_PENDING' && (
              <button onClick={() => navigate(`/supplier/contracts/${rel.contract.id}`)}>
                Assinar Contrato
              </button>
            )}

            {rel.status === 'ACTIVE' && (
              <>
                <p>Contrato assinado em: {rel.contract.supplierSignedAt}</p>
                <button>Ver Pedidos</button>
                <button>Ver Contrato</button>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## ⏱️ Estimativa Revisada

| Fase | Dias | Complexidade |
|------|------|--------------|
| **1. Schema + Migration** | 2 dias | Alta |
| **2. Backend Services** | 2-3 dias | Alta |
| **3. Backend Endpoints** | 1 dia | Média |
| **4. Frontend - Marca** | 2 dias | Média |
| **5. Frontend - Facção** | 1 dia | Baixa |
| **6. Frontend - Admin** | 1 dia | Baixa |
| **7. Testes E2E** | 1-2 dias | Média |
| **TOTAL** | **10-12 dias** | **Alta** |

---

## ✅ Checklist

### Schema & Migration
- [ ] Criar modelo `SupplierBrandRelationship`
- [ ] Criar modelo `BrandSpecificDocument`
- [ ] Modificar `SupplierOnboarding` (supplierId ao invés de credentialId)
- [ ] Modificar `SupplierContract` (relationshipId)
- [ ] Migration para migrar dados existentes
- [ ] Testar migration em ambiente de dev

### Backend
- [ ] Criar `RelationshipsService`
- [ ] Criar `RelationshipsController`
- [ ] Modificar `OnboardingService` (desacoplar de brand)
- [ ] Modificar `ContractsService` (gerar por relationship)
- [ ] Criar DTOs
- [ ] Testes unitários

### Frontend - Marca
- [ ] `BrandSuppliersPage` (lista de fornecedores)
- [ ] `AddSupplierPage` (novo vs pool)
- [ ] `SupplierDetailPage` (detalhes do relacionamento)
- [ ] Service `relationshipsService`

### Frontend - Facção
- [ ] `SupplierBrandsPage` (marcas que trabalha)
- [ ] `BrandDetailPage` (detalhes do relacionamento)

### Frontend - Admin
- [ ] `AdminSuppliersPoolPage` (pool global)
- [ ] `AdminSupplierDetailPage` (ver relacionamentos da facção)

### Testes
- [ ] E2E: Facção trabalha para 2 marcas simultaneamente
- [ ] E2E: Marca credencia facção do pool
- [ ] E2E: Suspender relacionamento com uma marca, continuar ativo com outra
- [ ] E2E: Assinar contratos separados com múltiplas marcas

---

## 🎯 Resultado Final

Após implementação:

**Facção pode:**
- ✅ Trabalhar para múltiplas marcas ao mesmo tempo
- ✅ Ter status independente por marca (ativa em A, suspensa em B)
- ✅ Assinar contratos separados com cada marca
- ✅ Ver dashboard com todas as marcas que trabalha

**Marca pode:**
- ✅ Credenciar facções novas (onboarding completo)
- ✅ Credenciar facções existentes do pool (apenas contrato)
- ✅ Gerenciar apenas seus fornecedores
- ✅ Suspender/encerrar relacionamento sem afetar outras marcas

**Admin pode:**
- ✅ Gerenciar pool global de facções
- ✅ Ver todos os relacionamentos
- ✅ Criar facções sem marca
- ✅ Atribuir facções a múltiplas marcas

---

**Complexidade:** Alta (mudança estrutural significativa)
**Estimativa:** 10-12 dias
**Risco:** Alto (requer migration de dados existentes)
