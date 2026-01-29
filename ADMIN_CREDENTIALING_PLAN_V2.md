# Plano REVISADO: Credenciamento com Pool Global de Facções

**Data:** 2026-01-28
**Objetivo:** Permitir que admin crie facções COM ou SEM vínculo com marca específica
**Estimativa:** 4-5 dias de implementação

---

## 🎯 Novos Requisitos

### Cenários de Credenciamento

**Cenário 1: Marca cria facção (existente)**
```
Marca → Criar Credencial → Validar CNPJ → Compliance
→ Enviar Convite → Facção faz Onboarding → Contrato → ACTIVE
brandId: presente desde o início
```

**Cenário 2: Admin cria facção PARA marca específica (novo)**
```
Admin → Criar Credencial → Selecionar Marca → Validar CNPJ
→ Compliance → Enviar Convite → Facção faz Onboarding → Contrato → ACTIVE
brandId: presente desde o início (admin escolhe)
```

**Cenário 3: Admin cria facção SEM marca - Pool Global (NOVO)**
```
Admin → Criar Credencial → NÃO selecionar marca → Validar CNPJ
→ Compliance → Status: POOL
→ Posteriormente: Marca reivindica OU Admin atribui
→ Aí sim: Enviar Convite → Onboarding → Contrato → ACTIVE
brandId: null inicialmente, preenchido depois
```

---

## 🏗️ Mudanças no Schema

### 1. Modificar SupplierCredential - brandId Opcional

**Arquivo:** `backend/prisma/schema.prisma` (MODIFICAR)

```prisma
model SupplierCredential {
  id          String  @id @default(uuid())
  brandId     String? // ← AGORA OPCIONAL (permite pool global)
  supplierId  String?
  createdById String

  // ... resto dos campos iguais

  // Relations
  brand     Company?  @relation("CredentialBrand", fields: [brandId], references: [id], onDelete: SetNull) // ← SetNull ao invés de Cascade
  supplier  Company?  @relation("CredentialSupplier", fields: [supplierId], references: [id])
  createdBy User      @relation("CredentialCreatedBy", fields: [createdById], references: [id])

  // ... resto das relations

  @@unique([brandId, cnpj]) // ← Permite CNPJ duplicado se brandId diferente
  @@index([brandId])
  @@index([status])
}
```

### 2. Adicionar Novos Status

**Arquivo:** `backend/prisma/schema.prisma` (MODIFICAR)

```prisma
enum SupplierCredentialStatus {
  // Status existentes
  DRAFT
  PENDING_CNPJ_VALIDATION
  CNPJ_VALIDATION_FAILED
  PENDING_COMPLIANCE
  COMPLIANCE_IN_PROGRESS
  COMPLIANCE_APPROVED
  COMPLIANCE_REJECTED
  MANUAL_REVIEW_REQUIRED
  INVITATION_SENT
  INVITATION_EXPIRED
  ONBOARDING_STARTED
  ONBOARDING_IN_PROGRESS
  DOCUMENTS_PENDING_VALIDATION
  DOCUMENTS_VALIDATED
  CONTRACT_PENDING
  CONTRACT_SIGNED
  ACTIVE
  SUSPENDED
  BLOCKED

  // ← NOVOS STATUS PARA POOL GLOBAL
  POOL_AVAILABLE        // Facção no pool, disponível para atribuição
  POOL_ASSIGNED         // Facção atribuída a marca, aguardando envio de convite
}
```

---

## 📋 Implementação Backend

### 1. Migration do Schema

**Comando:**
```bash
cd backend
npx prisma migrate dev --name make-brandid-optional-add-pool-status
```

**Migration SQL esperada:**
```sql
-- Make brandId nullable
ALTER TABLE "supplier_credentials" ALTER COLUMN "brandId" DROP NOT NULL;

-- Change onDelete behavior
ALTER TABLE "supplier_credentials" DROP CONSTRAINT "supplier_credentials_brandId_fkey";
ALTER TABLE "supplier_credentials"
  ADD CONSTRAINT "supplier_credentials_brandId_fkey"
  FOREIGN KEY ("brandId") REFERENCES "companies"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

-- Add new enum values
ALTER TYPE "SupplierCredentialStatus" ADD VALUE 'POOL_AVAILABLE';
ALTER TYPE "SupplierCredentialStatus" ADD VALUE 'POOL_ASSIGNED';
```

### 2. Modificar CreateCredentialDto

**Arquivo:** `backend/src/modules/credentials/dto/create-credential.dto.ts` (MODIFICAR)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID, IsBoolean } from 'class-validator';

export class CreateCredentialDto {
  @IsString()
  @IsNotEmpty()
  cnpj: string;

  @IsString()
  @IsNotEmpty()
  tradeName: string;

  @IsString()
  @IsOptional()
  legalName?: string;

  @IsString()
  @IsOptional()
  contactEmail?: string;

  @IsString()
  @IsOptional()
  contactPhone?: string;

  @IsString()
  @IsOptional()
  contactName?: string;

  /**
   * Brand ID - Comportamento:
   * - Se usuário é BRAND: ignorado (usa brandId do JWT)
   * - Se usuário é ADMIN: opcional
   *   - Se fornecido: cria para marca específica
   *   - Se null/undefined: cria no pool global (brandId = null)
   */
  @IsUUID()
  @IsOptional()
  brandId?: string | null;

  /**
   * Flag para indicar se é pool global
   * Facilita validação no frontend
   */
  @IsBoolean()
  @IsOptional()
  isPoolCredential?: boolean;
}
```

### 3. Modificar CredentialsService

**Arquivo:** `backend/src/modules/credentials/credentials.service.ts` (MODIFICAR)

**Método `create()` - Lógica de brandId:**

```typescript
async create(dto: CreateCredentialDto, user: AuthUser): Promise<SupplierCredential> {
  let brandId: string | null = null;
  let initialStatus: SupplierCredentialStatus = SupplierCredentialStatus.DRAFT;

  // ===== Lógica de brandId baseada no role =====
  if (user.role === UserRole.BRAND) {
    // Marca sempre cria para si mesma
    if (!user.brandId) {
      throw new BadRequestException('Usuário marca sem brandId associado');
    }
    brandId = user.brandId;
    initialStatus = SupplierCredentialStatus.DRAFT;

  } else if (user.role === UserRole.ADMIN) {
    // Admin pode criar COM ou SEM marca
    if (dto.brandId) {
      // Admin criando para marca específica
      const brandExists = await this.prisma.company.findUnique({
        where: { id: dto.brandId }
      });
      if (!brandExists) {
        throw new NotFoundException(`Marca com ID ${dto.brandId} não encontrada`);
      }
      brandId = dto.brandId;
      initialStatus = SupplierCredentialStatus.DRAFT;

    } else if (dto.isPoolCredential === true || dto.brandId === null) {
      // Admin criando no pool global (SEM marca)
      brandId = null;
      initialStatus = SupplierCredentialStatus.POOL_AVAILABLE;

    } else {
      throw new BadRequestException(
        'Admin deve especificar brandId OU indicar que é credencial de pool (isPoolCredential: true)'
      );
    }

  } else {
    throw new ForbiddenException('Apenas admin ou marca podem criar credenciais');
  }

  // ===== Validar CNPJ único =====
  // Se brandId existe, validar unicidade por marca
  // Se brandId null (pool), validar unicidade global
  const existingCredential = await this.prisma.supplierCredential.findFirst({
    where: {
      cnpj: dto.cnpj,
      brandId: brandId, // Pode ser string ou null
    }
  });

  if (existingCredential) {
    if (brandId) {
      throw new ConflictException('Já existe uma credencial com este CNPJ para esta marca');
    } else {
      throw new ConflictException('Já existe uma credencial com este CNPJ no pool global');
    }
  }

  // ===== Criar credencial =====
  const credential = await this.prisma.supplierCredential.create({
    data: {
      brandId,
      cnpj: dto.cnpj,
      tradeName: dto.tradeName,
      legalName: dto.legalName,
      contactName: dto.contactName,
      contactEmail: dto.contactEmail,
      contactPhone: dto.contactPhone,
      status: initialStatus,
      createdById: user.id,
    },
    include: {
      brand: true,
      createdBy: true,
    }
  });

  // ===== Criar histórico de status =====
  await this.prisma.credentialStatusHistory.create({
    data: {
      credentialId: credential.id,
      status: initialStatus,
      changedById: user.id,
      notes: brandId
        ? `Credencial criada por ${user.role} para marca ${credential.brand?.tradeName}`
        : 'Credencial criada no pool global da TexLink',
    }
  });

  return credential;
}
```

**Método `findAll()` - Filtrar por pool:**

```typescript
async findAll(user: AuthUser, filters?: CredentialFilters): Promise<SupplierCredential[]> {
  const where: Prisma.SupplierCredentialWhereInput = {};

  // ===== Filtro por role =====
  if (user.role === UserRole.BRAND) {
    // Marca vê apenas suas credenciais (brandId = seu brandId)
    if (!user.brandId) {
      throw new BadRequestException('Usuário marca sem brandId associado');
    }
    where.brandId = user.brandId;

  } else if (user.role === UserRole.ADMIN) {
    // Admin vê tudo, mas pode filtrar
    if (filters?.showPoolOnly === true) {
      // Mostrar apenas pool global
      where.brandId = null;
    } else if (filters?.brandId) {
      // Filtrar por marca específica
      where.brandId = filters.brandId;
    }
    // Se nenhum filtro, mostra TUDO (pool + todas as marcas)

  } else {
    throw new ForbiddenException('Apenas admin ou marca podem listar credenciais');
  }

  // ===== Filtros adicionais =====
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.cnpj) {
    where.cnpj = { contains: filters.cnpj };
  }

  return this.prisma.supplierCredential.findMany({
    where,
    include: {
      brand: true,
      onboarding: {
        include: { documents: true }
      },
      contract: true,
      createdBy: {
        select: { id: true, name: true, email: true }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

**Novo Método: `assignToMarca()` - Atribuir facção do pool a marca:**

```typescript
/**
 * Atribuir facção do pool global a uma marca específica
 * Apenas admin pode fazer isso
 */
async assignToBrand(
  credentialId: string,
  brandId: string,
  user: AuthUser,
): Promise<SupplierCredential> {
  // Verificar permissão: apenas admin
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem atribuir facções do pool');
  }

  // Buscar credencial
  const credential = await this.prisma.supplierCredential.findUnique({
    where: { id: credentialId },
    include: { brand: true }
  });

  if (!credential) {
    throw new NotFoundException('Credencial não encontrada');
  }

  // Validar que está no pool (brandId null)
  if (credential.brandId !== null) {
    throw new BadRequestException(
      'Esta credencial já está vinculada a uma marca. Use o endpoint de transferência.'
    );
  }

  // Validar que está disponível no pool
  if (credential.status !== SupplierCredentialStatus.POOL_AVAILABLE) {
    throw new BadRequestException(
      `Credencial não está disponível para atribuição. Status atual: ${credential.status}`
    );
  }

  // Validar que marca existe
  const brand = await this.prisma.company.findUnique({
    where: { id: brandId }
  });
  if (!brand) {
    throw new NotFoundException('Marca não encontrada');
  }

  // Validar CNPJ único para essa marca
  const duplicateCNPJ = await this.prisma.supplierCredential.findFirst({
    where: {
      cnpj: credential.cnpj,
      brandId: brandId,
      id: { not: credentialId }
    }
  });
  if (duplicateCNPJ) {
    throw new ConflictException(
      `Marca ${brand.tradeName} já possui uma credencial com CNPJ ${credential.cnpj}`
    );
  }

  // Atribuir a marca
  const updated = await this.prisma.supplierCredential.update({
    where: { id: credentialId },
    data: {
      brandId: brandId,
      status: SupplierCredentialStatus.POOL_ASSIGNED,
      updatedAt: new Date(),
    },
    include: {
      brand: true,
      createdBy: true,
    }
  });

  // Criar histórico
  await this.prisma.credentialStatusHistory.create({
    data: {
      credentialId: credentialId,
      status: SupplierCredentialStatus.POOL_ASSIGNED,
      changedById: user.id,
      notes: `Facção atribuída do pool global para marca ${brand.tradeName} por ${user.name}`,
    }
  });

  return updated;
}
```

**Novo Método: `returnToPool()` - Devolver facção ao pool:**

```typescript
/**
 * Remover vínculo com marca e devolver ao pool global
 * Apenas admin, e apenas se não tiver contrato assinado
 */
async returnToPool(credentialId: string, user: AuthUser): Promise<SupplierCredential> {
  if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas administradores podem devolver facções ao pool');
  }

  const credential = await this.prisma.supplierCredential.findUnique({
    where: { id: credentialId },
    include: { contract: true, brand: true }
  });

  if (!credential) {
    throw new NotFoundException('Credencial não encontrada');
  }

  if (credential.brandId === null) {
    throw new BadRequestException('Esta credencial já está no pool global');
  }

  // Validar que não tem contrato assinado
  if (credential.contract?.supplierSignedAt) {
    throw new BadRequestException(
      'Não é possível devolver ao pool: contrato já foi assinado pelo fornecedor'
    );
  }

  // Se onboarding iniciado, resetar
  const shouldResetOnboarding = credential.status !== SupplierCredentialStatus.DRAFT;

  // Devolver ao pool
  const updated = await this.prisma.supplierCredential.update({
    where: { id: credentialId },
    data: {
      brandId: null,
      status: SupplierCredentialStatus.POOL_AVAILABLE,
      updatedAt: new Date(),
    },
    include: { brand: true }
  });

  // Criar histórico
  await this.prisma.credentialStatusHistory.create({
    data: {
      credentialId: credentialId,
      status: SupplierCredentialStatus.POOL_AVAILABLE,
      changedById: user.id,
      notes: `Facção devolvida ao pool global. Anteriormente vinculada à marca ${credential.brand?.tradeName}`,
    }
  });

  // TODO: Notificar marca que facção foi removida

  return updated;
}
```

### 4. Modificar CredentialsController

**Arquivo:** `backend/src/modules/credentials/credentials.controller.ts` (MODIFICAR)

```typescript
import { Controller, UseGuards, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOrBrandGuard } from '../../common/guards/admin-or-brand.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // ===== Endpoints existentes (modificados) =====

  @Post()
  @UseGuards(AdminOrBrandGuard)
  async create(@Body() dto: CreateCredentialDto, @CurrentUser() user: AuthUser) {
    return this.credentialsService.create(dto, user);
  }

  @Get()
  @UseGuards(AdminOrBrandGuard)
  async findAll(@CurrentUser() user: AuthUser, @Query() filters?: CredentialFilters) {
    return this.credentialsService.findAll(user, filters);
  }

  // ===== NOVOS ENDPOINTS PARA POOL =====

  /**
   * Listar apenas credenciais do pool global (brandId null)
   * Apenas admin
   */
  @Get('pool')
  @UseGuards(AdminGuard)
  async getPool(@CurrentUser() user: AuthUser, @Query() filters?: CredentialFilters) {
    return this.credentialsService.findAll(user, { ...filters, showPoolOnly: true });
  }

  /**
   * Atribuir facção do pool a uma marca
   * Apenas admin
   */
  @Post(':id/assign-to-brand')
  @UseGuards(AdminGuard)
  async assignToBrand(
    @Param('id') id: string,
    @Body('brandId') brandId: string,
    @CurrentUser() user: AuthUser,
  ) {
    return this.credentialsService.assignToBrand(id, brandId, user);
  }

  /**
   * Remover vínculo e devolver facção ao pool
   * Apenas admin
   */
  @Post(':id/return-to-pool')
  @UseGuards(AdminGuard)
  async returnToPool(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.credentialsService.returnToPool(id, user);
  }

  /**
   * Listar todas as marcas (para dropdown)
   * Apenas admin
   */
  @Get('brands')
  @UseGuards(AdminGuard)
  async getAllBrands() {
    return this.credentialsService.getAllBrands();
  }
}
```

---

## 📋 Implementação Frontend

### 1. Modificar AdminCreateCredentialPage

**Arquivo:** `src/pages/admin/credentials/AdminCreateCredentialPage.tsx` (MODIFICAR)

**Adicionar toggle "Pool Global":**

```typescript
const [formData, setFormData] = useState({
  brandId: '',
  cnpj: '',
  tradeName: '',
  legalName: '',
  contactName: '',
  contactEmail: '',
  contactPhone: '',
  isPoolCredential: false, // ← NOVO
});

// No JSX:
<div className="border-t border-gray-200 pt-6">
  <div className="flex items-start gap-3">
    <input
      type="checkbox"
      id="isPoolCredential"
      checked={formData.isPoolCredential}
      onChange={(e) => setFormData({
        ...formData,
        isPoolCredential: e.target.checked,
        brandId: e.target.checked ? '' : formData.brandId // Limpar brandId se pool
      })}
      className="mt-1 w-5 h-5 text-blue-600 border-gray-300 rounded"
    />
    <div className="flex-1">
      <label htmlFor="isPoolCredential" className="font-medium text-gray-900 cursor-pointer">
        Adicionar ao Pool Global da TexLink
      </label>
      <p className="text-sm text-gray-600 mt-1">
        Facção não será vinculada a nenhuma marca específica inicialmente.
        Você poderá atribuir a uma marca posteriormente.
      </p>
    </div>
  </div>
</div>

{/* Seleção de Marca - Desabilitado se pool */}
<div>
  <label className="block text-sm font-medium text-gray-700 mb-2">
    Marca {!formData.isPoolCredential && '*'}
  </label>
  <select
    value={formData.brandId}
    onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
    required={!formData.isPoolCredential}
    disabled={formData.isPoolCredential}
    className="w-full px-3 py-2 border border-gray-300 rounded-md disabled:bg-gray-100 disabled:cursor-not-allowed"
  >
    <option value="">
      {formData.isPoolCredential ? 'Pool Global (sem marca)' : 'Selecione uma marca'}
    </option>
    {!formData.isPoolCredential && brands.map((brand) => (
      <option key={brand.id} value={brand.id}>
        {brand.tradeName} - {brand.document}
      </option>
    ))}
  </select>
</div>
```

### 2. Criar AdminPoolPage

**Arquivo:** `src/pages/admin/credentials/AdminPoolPage.tsx` (CRIAR)

```typescript
import React, { useState, useEffect } from 'react';
import { Users, ArrowRight } from 'lucide-react';
import { credentialsService, type SupplierCredential, type Company } from '../../../services/credentials.service';
import { AssignToBrandModal } from './components/AssignToBrandModal';

/**
 * Dashboard do Pool Global de Facções
 *
 * Exibe facções sem marca (brandId null)
 * Admin pode atribuir a marcas
 */
export function AdminPoolPage() {
  const [poolCredentials, setPoolCredentials] = useState<SupplierCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCredential, setSelectedCredential] = useState<SupplierCredential | null>(null);

  useEffect(() => {
    loadPool();
  }, []);

  const loadPool = async () => {
    try {
      setIsLoading(true);
      const data = await credentialsService.getPool();
      setPoolCredentials(data);
    } catch (error) {
      console.error('Erro ao carregar pool:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAssign = async (credentialId: string, brandId: string) => {
    try {
      await credentialsService.assignToBrand(credentialId, brandId);
      await loadPool(); // Refresh
      setSelectedCredential(null);
    } catch (error: any) {
      alert(error.message || 'Erro ao atribuir facção');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Users className="w-8 h-8 text-blue-600" />
          Pool Global de Facções
        </h1>
        <p className="text-gray-600 mt-1">
          Facções cadastradas sem vínculo com marca específica
        </p>
      </div>

      {/* Estatísticas */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 font-medium">Total no Pool</p>
          <p className="text-3xl font-bold text-blue-900 mt-1">
            {poolCredentials.length}
          </p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-sm text-green-600 font-medium">Disponíveis</p>
          <p className="text-3xl font-bold text-green-900 mt-1">
            {poolCredentials.filter(c => c.status === 'POOL_AVAILABLE').length}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 font-medium">Atribuídas</p>
          <p className="text-3xl font-bold text-yellow-900 mt-1">
            {poolCredentials.filter(c => c.status === 'POOL_ASSIGNED').length}
          </p>
        </div>
      </div>

      {/* Lista */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : poolCredentials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <Users className="w-12 h-12 text-gray-400 mx-auto mb-3" />
          <p className="text-gray-600">Nenhuma facção no pool global</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {poolCredentials.map((credential) => (
            <div
              key={credential.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1 min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">
                    {credential.tradeName}
                  </h3>
                  <p className="text-sm text-gray-600">{credential.cnpj}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                  credential.status === 'POOL_AVAILABLE'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-yellow-100 text-yellow-800'
                }`}>
                  {credential.status === 'POOL_AVAILABLE' ? 'Disponível' : 'Atribuída'}
                </span>
              </div>

              {credential.contactName && (
                <p className="text-sm text-gray-600 mb-3">
                  Contato: {credential.contactName}
                </p>
              )}

              <button
                onClick={() => setSelectedCredential(credential)}
                disabled={credential.status !== 'POOL_AVAILABLE'}
                className="w-full px-3 py-2 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <ArrowRight className="w-4 h-4" />
                Atribuir a Marca
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Modal de Atribuição */}
      {selectedCredential && (
        <AssignToBrandModal
          credential={selectedCredential}
          onClose={() => setSelectedCredential(null)}
          onAssign={(brandId) => handleAssign(selectedCredential.id, brandId)}
        />
      )}
    </div>
  );
}
```

### 3. Criar AssignToBrandModal

**Arquivo:** `src/pages/admin/credentials/components/AssignToBrandModal.tsx` (CRIAR)

```typescript
import React, { useState, useEffect } from 'react';
import { X, Building2, ArrowRight } from 'lucide-react';
import { credentialsService, type SupplierCredential, type Company } from '../../../../services/credentials.service';

interface AssignToBrandModalProps {
  credential: SupplierCredential;
  onClose: () => void;
  onAssign: (brandId: string) => Promise<void>;
}

export function AssignToBrandModal({ credential, onClose, onAssign }: AssignToBrandModalProps) {
  const [brands, setBrands] = useState<Company[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setIsLoading(true);
      const data = await credentialsService.getAllBrands();
      setBrands(data);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBrandId) return;

    setIsSubmitting(true);
    try {
      await onAssign(selectedBrandId);
    } catch (error) {
      // Error handling feito no parent
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-md w-full p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            Atribuir Facção a Marca
          </h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="mb-6 p-4 bg-gray-50 border border-gray-200 rounded-lg">
          <h3 className="font-semibold text-gray-900 mb-1">
            {credential.tradeName}
          </h3>
          <p className="text-sm text-gray-600">CNPJ: {credential.cnpj}</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Selecione a Marca *
            </label>
            {isLoading ? (
              <div className="text-center py-4 text-gray-600">
                Carregando marcas...
              </div>
            ) : (
              <select
                value={selectedBrandId}
                onChange={(e) => setSelectedBrandId(e.target.value)}
                required
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Selecione uma marca</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.id}>
                    {brand.tradeName} - {brand.document}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-6">
            <p className="text-sm text-blue-700">
              Após atribuir, a facção ficará vinculada à marca selecionada.
              Você poderá então enviar o convite de onboarding.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={!selectedBrandId || isSubmitting}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                'Atribuindo...'
              ) : (
                <>
                  <ArrowRight className="w-4 h-4" />
                  Atribuir
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
```

### 4. Atualizar credentialsService

**Arquivo:** `src/services/credentials.service.ts` (MODIFICAR)

```typescript
// Adicionar novos métodos

async getPool(): Promise<SupplierCredential[]> {
  const response = await api.get('/credentials/pool');
  return response.data;
}

async assignToBrand(credentialId: string, brandId: string): Promise<SupplierCredential> {
  const response = await api.post(`/credentials/${credentialId}/assign-to-brand`, { brandId });
  return response.data;
}

async returnToPool(credentialId: string): Promise<SupplierCredential> {
  const response = await api.post(`/credentials/${credentialId}/return-to-pool`);
  return response.data;
}
```

### 5. Adicionar Rotas

**Arquivo:** `src/App.tsx` (MODIFICAR)

```typescript
// Rotas Admin
<Route path="/admin/credentials" element={<AdminCredentialsPage />} />
<Route path="/admin/credentials/new" element={<AdminCreateCredentialPage />} />
<Route path="/admin/credentials/pool" element={<AdminPoolPage />} /> {/* ← NOVO */}
<Route path="/admin/credentials/:id" element={<AdminCredentialDetailPage />} />
```

---

## 📊 Fluxos Completos

### Fluxo 1: Admin cria facção NO POOL

```
1. Admin acessa /admin/credentials/new
2. Marca checkbox "Pool Global"
3. Preenche CNPJ, nome, contato
4. Salva (brandId = null, status = POOL_AVAILABLE)
5. Facção aparece em /admin/credentials/pool
6. Admin clica "Atribuir a Marca"
7. Seleciona marca no dropdown
8. Sistema atualiza: brandId = marca, status = POOL_ASSIGNED
9. Agora pode enviar convite normalmente
```

### Fluxo 2: Admin cria facção PARA MARCA

```
1. Admin acessa /admin/credentials/new
2. NÃO marca checkbox "Pool Global"
3. Seleciona marca no dropdown
4. Preenche CNPJ, nome, contato
5. Salva (brandId = marca, status = DRAFT)
6. Fluxo normal: validar CNPJ → compliance → convite
```

### Fluxo 3: Marca cria facção (existente, sem mudanças)

```
1. Marca acessa /brand/credentials/new
2. Preenche dados (brandId automático do JWT)
3. Fluxo normal
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar migration para tornar `brandId` nullable
- [ ] Adicionar novos status: `POOL_AVAILABLE`, `POOL_ASSIGNED`
- [ ] Modificar `CreateCredentialDto` (adicionar `isPoolCredential`)
- [ ] Modificar `CredentialsService.create()` (lógica de pool)
- [ ] Adicionar método `assignToBrand()`
- [ ] Adicionar método `returnToPool()`
- [ ] Modificar `findAll()` (filtro de pool)
- [ ] Adicionar endpoint `GET /credentials/pool`
- [ ] Adicionar endpoint `POST /credentials/:id/assign-to-brand`
- [ ] Adicionar endpoint `POST /credentials/:id/return-to-pool`
- [ ] Testar todos os cenários

### Frontend
- [ ] Modificar `AdminCreateCredentialPage` (checkbox pool)
- [ ] Criar `AdminPoolPage` (dashboard do pool)
- [ ] Criar `AssignToBrandModal` (modal de atribuição)
- [ ] Atualizar `credentialsService` (novos métodos)
- [ ] Adicionar rotas
- [ ] Adicionar link no menu admin "Pool de Facções"
- [ ] Testar fluxos E2E

### Testes
- [ ] Teste: Admin cria no pool → atribui a marca → envia convite
- [ ] Teste: Admin cria para marca diretamente
- [ ] Teste: Marca não vê facções do pool
- [ ] Teste: Admin vê pool + todas as marcas
- [ ] Teste: Não permitir atribuir facção já vinculada
- [ ] Teste: Não permitir devolver ao pool se contrato assinado

---

## 📝 Comparação Final

| Aspecto | Plano V1 (brandId obrigatório) | Plano V2 (pool global) |
|---------|-------------------------------|------------------------|
| **brandId** | Sempre presente | Opcional (nullable) |
| **Criação por Admin** | Seleciona marca obrigatório | Seleciona marca OU pool |
| **Status** | 17 status existentes | +2 status (POOL_AVAILABLE, POOL_ASSIGNED) |
| **Atribuição** | Não aplicável | Endpoint `assignToBrand()` |
| **Visualização Admin** | Filtrar por marca | Ver pool + todas |
| **Complexidade** | Média | Média-Alta |
| **Estimativa** | 3-4 dias | 4-5 dias |

---

**Estimativa Revisada:** 4-5 dias de implementação
**Complexidade:** Média-Alta
**Risco:** Médio (requer migration de schema + lógica mais complexa)
