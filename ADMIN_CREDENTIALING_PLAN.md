# Plano: Credenciamento Iniciado pelo Admin TexLink

**Data:** 2026-01-28
**Objetivo:** Permitir que administradores TexLink iniciem o processo de credenciamento de fornecedores (facções) da mesma forma que as marcas fazem
**Estimativa:** 3-4 dias de implementação

---

## 🎯 Análise da Necessidade

### Fluxo Atual (Marca → Facção)
```
Marca → Adicionar Fornecedor → Validar CNPJ → Compliance → Enviar Convite
→ Facção recebe email/WhatsApp → Onboarding (6 steps) → Marca valida docs
→ Facção assina contrato → ACTIVE
```

### Novo Fluxo (Admin → Facção)
```
Admin TexLink → Adicionar Fornecedor → Selecionar Marca → Validar CNPJ
→ Compliance → Enviar Convite → Facção recebe email/WhatsApp
→ Onboarding (6 steps) → Admin OU Marca valida docs
→ Facção assina contrato → ACTIVE
```

**Diferença Chave:** Admin precisa escolher para qual marca está cadastrando o fornecedor.

---

## 🏗️ Decisões de Arquitetura

### Opção Escolhida: Admin como Proxy da Marca

**Justificativa:**
- O modelo `SupplierCredential` tem campo `brandId` obrigatório
- Contratos são entre fornecedor e marca específica
- Documentos precisam validação conforme requisitos da marca
- Mantém integridade do modelo de negócio existente

**Como Funciona:**
1. Admin seleciona marca ao criar credencial
2. Credencial fica vinculado à marca escolhida (`brandId`)
3. Admin pode validar documentos OU delegar para marca
4. Marca vê credencial no dashboard como se tivesse criado
5. Contrato gerado é entre fornecedor e marca selecionada

### Permissões e Autorização

```typescript
// Matriz de Permissões
┌─────────────────────────────┬───────┬───────┬──────────┐
│ Ação                        │ Brand │ Admin │ Supplier │
├─────────────────────────────┼───────┼───────┼──────────┤
│ Criar credencial            │  ✅   │  ✅   │    ❌    │
│ Validar CNPJ                │  ✅   │  ✅   │    ❌    │
│ Enviar convite              │  ✅   │  ✅   │    ❌    │
│ Ver credenciais da marca    │  ✅   │  ✅   │    ❌    │
│ Ver credenciais de TODAS    │  ❌   │  ✅   │    ❌    │
│ Validar documentos          │  ✅   │  ✅   │    ❌    │
│ Ativar fornecedor           │  ✅   │  ✅   │    ❌    │
│ Fazer onboarding            │  ❌   │  ❌   │    ✅    │
│ Assinar contrato            │  ❌   │  ❌   │    ✅    │
└─────────────────────────────┴───────┴───────┴──────────┘
```

---

## 📋 Mudanças Necessárias

### 1. Backend - Autorização e Guards

#### Criar AdminOrBrandGuard

**Arquivo:** `backend/src/common/guards/admin-or-brand.guard.ts` (CRIAR)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Guard que permite acesso a Admin OU Brand (marca)
 * Usado em endpoints que ambos podem acessar
 */
@Injectable()
export class AdminOrBrandGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Usuário não autenticado');
    }

    const allowedRoles = [UserRole.ADMIN, UserRole.BRAND];

    if (!allowedRoles.includes(user.role)) {
      throw new ForbiddenException('Acesso negado. Apenas admin ou marca podem acessar este recurso.');
    }

    return true;
  }
}
```

#### Criar AdminGuard

**Arquivo:** `backend/src/common/guards/admin.guard.ts` (CRIAR)

```typescript
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';
import { UserRole } from '@prisma/client';

/**
 * Guard que permite acesso APENAS a Admin
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || user.role !== UserRole.ADMIN) {
      throw new ForbiddenException('Acesso negado. Apenas administradores podem acessar este recurso.');
    }

    return true;
  }
}
```

### 2. Backend - Credentials Service

#### Modificar CredentialsService para suportar Admin

**Arquivo:** `backend/src/modules/credentials/credentials.service.ts` (MODIFICAR)

**Mudanças:**

1. **Método `create()` - Permitir admin selecionar brandId**
```typescript
async create(dto: CreateCredentialDto, user: AuthUser): Promise<SupplierCredential> {
  // Se usuário é BRAND, usar seu brandId
  // Se usuário é ADMIN, usar brandId do DTO (obrigatório)

  let brandId: string;

  if (user.role === UserRole.BRAND) {
    if (!user.brandId) {
      throw new BadRequestException('Usuário marca sem brandId associado');
    }
    brandId = user.brandId;
  } else if (user.role === UserRole.ADMIN) {
    if (!dto.brandId) {
      throw new BadRequestException('Admin deve especificar brandId ao criar credencial');
    }
    brandId = dto.brandId;

    // Validar que brand existe
    const brandExists = await this.prisma.company.findUnique({
      where: { id: brandId }
    });
    if (!brandExists) {
      throw new NotFoundException(`Marca com ID ${brandId} não encontrada`);
    }
  } else {
    throw new ForbiddenException('Apenas admin ou marca podem criar credenciais');
  }

  // Restante do código continua igual...
  return this.prisma.supplierCredential.create({
    data: {
      brandId,
      cnpj: dto.cnpj,
      // ... outros campos
    }
  });
}
```

2. **Método `findAll()` - Admin vê todas, Brand vê apenas suas**
```typescript
async findAll(user: AuthUser, filters?: CredentialFilters): Promise<SupplierCredential[]> {
  const where: Prisma.SupplierCredentialWhereInput = {};

  // Se usuário é BRAND, filtrar por brandId
  if (user.role === UserRole.BRAND) {
    if (!user.brandId) {
      throw new BadRequestException('Usuário marca sem brandId associado');
    }
    where.brandId = user.brandId;
  }
  // Se usuário é ADMIN, não filtrar (vê todas)
  // Se usuário é outro role, erro
  else if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas admin ou marca podem listar credenciais');
  }

  // Aplicar filtros adicionais
  if (filters?.status) {
    where.status = filters.status;
  }
  if (filters?.cnpj) {
    where.cnpj = { contains: filters.cnpj };
  }
  if (filters?.brandId && user.role === UserRole.ADMIN) {
    where.brandId = filters.brandId;
  }

  return this.prisma.supplierCredential.findMany({
    where,
    include: {
      brand: true,
      onboarding: {
        include: { documents: true }
      },
      contract: true,
    },
    orderBy: { createdAt: 'desc' }
  });
}
```

3. **Método `validateDocument()` - Permitir Admin validar**
```typescript
async validateDocument(
  credentialId: string,
  documentId: string,
  isValid: boolean,
  validationNotes: string | undefined,
  user: AuthUser,
): Promise<OnboardingDocument> {
  // Buscar credencial
  const credential = await this.prisma.supplierCredential.findUnique({
    where: { id: credentialId },
    include: {
      onboarding: {
        include: { documents: true }
      }
    }
  });

  if (!credential) {
    throw new NotFoundException('Credencial não encontrada');
  }

  // Verificar permissão:
  // - Brand pode validar apenas seus próprios fornecedores
  // - Admin pode validar qualquer fornecedor
  if (user.role === UserRole.BRAND) {
    if (credential.brandId !== user.brandId) {
      throw new ForbiddenException('Você não tem permissão para validar documentos deste fornecedor');
    }
  } else if (user.role !== UserRole.ADMIN) {
    throw new ForbiddenException('Apenas admin ou marca podem validar documentos');
  }

  // Restante do código continua igual...
}
```

### 3. Backend - DTOs

#### Modificar CreateCredentialDto

**Arquivo:** `backend/src/modules/credentials/dto/create-credential.dto.ts` (MODIFICAR)

```typescript
import { IsString, IsNotEmpty, IsOptional, IsUUID } from 'class-validator';

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
   * Brand ID - Obrigatório apenas quando usuário é ADMIN
   * Ignorado quando usuário é BRAND (usa brandId do usuário)
   */
  @IsUUID()
  @IsOptional()
  brandId?: string;
}
```

### 4. Backend - Controller

#### Modificar CredentialsController

**Arquivo:** `backend/src/modules/credentials/credentials.controller.ts` (MODIFICAR)

**Mudanças:**

1. **Substituir `BrandGuard` por `AdminOrBrandGuard` nos endpoints compartilhados**

```typescript
import { Controller, UseGuards, Post, Get, Patch, Body, Param, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminOrBrandGuard } from '../../common/guards/admin-or-brand.guard';
import { AdminGuard } from '../../common/guards/admin.guard';

@Controller('credentials')
@UseGuards(JwtAuthGuard)
export class CredentialsController {
  constructor(private readonly credentialsService: CredentialsService) {}

  // Criar credencial - Admin OU Brand
  @Post()
  @UseGuards(AdminOrBrandGuard)
  async create(@Body() dto: CreateCredentialDto, @CurrentUser() user: AuthUser) {
    return this.credentialsService.create(dto, user);
  }

  // Listar credenciais - Admin vê todas, Brand vê apenas suas
  @Get()
  @UseGuards(AdminOrBrandGuard)
  async findAll(@CurrentUser() user: AuthUser, @Query() filters?: CredentialFilters) {
    return this.credentialsService.findAll(user, filters);
  }

  // Validar CNPJ - Admin OU Brand
  @Post(':id/validate-cnpj')
  @UseGuards(AdminOrBrandGuard)
  async validateCNPJ(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.credentialsService.validateCNPJ(id, user);
  }

  // Enviar convite - Admin OU Brand
  @Post(':id/invite')
  @UseGuards(AdminOrBrandGuard)
  async sendInvite(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.credentialsService.sendInvite(id, user);
  }

  // Validar documento - Admin OU Brand
  @Patch(':id/documents/:documentId')
  @UseGuards(AdminOrBrandGuard)
  async validateDocument(
    @Param('id') id: string,
    @Param('documentId') documentId: string,
    @Body() dto: ValidateDocumentDto,
    @CurrentUser() user: AuthUser,
  ) {
    return this.credentialsService.validateDocument(
      id,
      documentId,
      dto.isValid,
      dto.validationNotes,
      user,
    );
  }

  // Ativar fornecedor - Admin OU Brand
  @Post(':id/activate')
  @UseGuards(AdminOrBrandGuard)
  async activate(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    return this.credentialsService.activateSupplier(id, user);
  }

  // [NOVO] Endpoint exclusivo admin - Listar todas as marcas
  @Get('brands')
  @UseGuards(AdminGuard)
  async getAllBrands() {
    return this.credentialsService.getAllBrands();
  }
}
```

2. **Adicionar método no service para listar marcas**

```typescript
// Em credentials.service.ts
async getAllBrands(): Promise<Company[]> {
  return this.prisma.company.findMany({
    where: {
      // Filtrar apenas empresas que são marcas
      // Assumindo que existe algum campo que identifica marcas
    },
    select: {
      id: true,
      tradeName: true,
      legalName: true,
      document: true,
    },
    orderBy: { tradeName: 'asc' }
  });
}
```

### 5. Frontend - Páginas Admin

#### Criar AdminCredentialsPage

**Arquivo:** `src/pages/admin/credentials/AdminCredentialsPage.tsx` (CRIAR)

```typescript
import React, { useState, useEffect } from 'react';
import { Plus, Search, Filter } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { credentialsService, type SupplierCredential } from '../../../services/credentials.service';

/**
 * Dashboard Admin para gerenciar credenciamento de fornecedores
 *
 * Features:
 * - Listar TODAS as credenciais (de todas as marcas)
 * - Filtrar por marca, status, CNPJ
 * - Criar nova credencial (com seleção de marca)
 * - Ver detalhes e validar documentos
 */
export function AdminCredentialsPage() {
  const navigate = useNavigate();
  const [credentials, setCredentials] = useState<SupplierCredential[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filters, setFilters] = useState({
    brandId: '',
    status: '',
    cnpj: '',
  });

  useEffect(() => {
    loadCredentials();
  }, [filters]);

  const loadCredentials = async () => {
    try {
      setIsLoading(true);
      const data = await credentialsService.getAll(filters);
      setCredentials(data);
    } catch (error) {
      console.error('Erro ao carregar credenciais:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Credenciamento de Fornecedores
          </h1>
          <p className="text-gray-600 mt-1">
            Gerencie fornecedores de todas as marcas
          </p>
        </div>
        <button
          onClick={() => navigate('/admin/credentials/new')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
        >
          <Plus className="w-5 h-5" />
          Adicionar Fornecedor
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Marca
            </label>
            <select
              value={filters.brandId}
              onChange={(e) => setFilters({ ...filters, brandId: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todas as marcas</option>
              {/* TODO: Carregar marcas */}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => setFilters({ ...filters, status: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="">Todos os status</option>
              <option value="DRAFT">Rascunho</option>
              <option value="ONBOARDING_IN_PROGRESS">Onboarding</option>
              <option value="ACTIVE">Ativo</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CNPJ
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                value={filters.cnpj}
                onChange={(e) => setFilters({ ...filters, cnpj: e.target.value })}
                placeholder="Buscar por CNPJ"
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Tabela */}
      {isLoading ? (
        <div className="text-center py-12">Carregando...</div>
      ) : credentials.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg">
          <p className="text-gray-600">Nenhuma credencial encontrada</p>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Fornecedor
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  CNPJ
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Marca
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Data
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">
                  Ações
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {credentials.map((credential) => (
                <tr key={credential.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="font-medium text-gray-900">
                      {credential.tradeName}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {credential.cnpj}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {credential.brand?.tradeName || '-'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <StatusBadge status={credential.status} />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {new Date(credential.createdAt).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button
                      onClick={() => navigate(`/admin/credentials/${credential.id}`)}
                      className="text-blue-600 hover:text-blue-800"
                    >
                      Ver Detalhes
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    DRAFT: 'bg-gray-100 text-gray-800',
    ONBOARDING_IN_PROGRESS: 'bg-blue-100 text-blue-800',
    ACTIVE: 'bg-green-100 text-green-800',
  };

  return (
    <span className={`px-2 py-1 text-xs font-medium rounded-full ${styles[status] || 'bg-gray-100 text-gray-800'}`}>
      {status}
    </span>
  );
}
```

#### Criar AdminCreateCredentialPage

**Arquivo:** `src/pages/admin/credentials/AdminCreateCredentialPage.tsx` (CRIAR)

```typescript
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { credentialsService } from '../../../services/credentials.service';
import type { Company } from '../../../types';

/**
 * Formulário para admin criar nova credencial
 *
 * Features:
 * - Seleção de marca (dropdown)
 * - Validação de CNPJ
 * - Busca de dados na Receita Federal
 * - Criação da credencial vinculada à marca
 */
export function AdminCreateCredentialPage() {
  const navigate = useNavigate();
  const [brands, setBrands] = useState<Company[]>([]);
  const [isLoadingBrands, setIsLoadingBrands] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    brandId: '',
    cnpj: '',
    tradeName: '',
    legalName: '',
    contactName: '',
    contactEmail: '',
    contactPhone: '',
  });

  useEffect(() => {
    loadBrands();
  }, []);

  const loadBrands = async () => {
    try {
      setIsLoadingBrands(true);
      const data = await credentialsService.getAllBrands();
      setBrands(data);
    } catch (error) {
      console.error('Erro ao carregar marcas:', error);
      setError('Erro ao carregar lista de marcas');
    } finally {
      setIsLoadingBrands(false);
    }
  };

  const handleCNPJBlur = async () => {
    if (formData.cnpj.length < 14) return;

    try {
      // Buscar dados na Receita Federal
      const cnpjData = await credentialsService.fetchCNPJData(formData.cnpj);
      setFormData(prev => ({
        ...prev,
        tradeName: cnpjData.tradeName || prev.tradeName,
        legalName: cnpjData.legalName || prev.legalName,
      }));
    } catch (error) {
      console.error('Erro ao buscar CNPJ:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!formData.brandId) {
      setError('Selecione uma marca');
      return;
    }

    setIsSubmitting(true);

    try {
      const credential = await credentialsService.create(formData);
      navigate(`/admin/credentials/${credential.id}`);
    } catch (error: any) {
      setError(error.message || 'Erro ao criar credencial');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoadingBrands) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          Adicionar Novo Fornecedor
        </h1>
        <p className="text-gray-600 mt-1">
          Cadastre um novo fornecedor para uma marca
        </p>
      </div>

      <form onSubmit={handleSubmit} className="bg-white border border-gray-200 rounded-lg p-6 space-y-6">
        {/* Seleção de Marca */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Marca *
          </label>
          <select
            value={formData.brandId}
            onChange={(e) => setFormData({ ...formData, brandId: e.target.value })}
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
          <p className="text-xs text-gray-500 mt-1">
            O fornecedor será vinculado a esta marca
          </p>
        </div>

        {/* CNPJ */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            CNPJ *
          </label>
          <input
            type="text"
            value={formData.cnpj}
            onChange={(e) => setFormData({ ...formData, cnpj: e.target.value })}
            onBlur={handleCNPJBlur}
            placeholder="00.000.000/0000-00"
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Nome Fantasia */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Nome Fantasia *
          </label>
          <input
            type="text"
            value={formData.tradeName}
            onChange={(e) => setFormData({ ...formData, tradeName: e.target.value })}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Razão Social */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Razão Social
          </label>
          <input
            type="text"
            value={formData.legalName}
            onChange={(e) => setFormData({ ...formData, legalName: e.target.value })}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Dados de Contato */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Nome do Contato
            </label>
            <input
              type="text"
              value={formData.contactName}
              onChange={(e) => setFormData({ ...formData, contactName: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email do Contato
            </label>
            <input
              type="email"
              value={formData.contactEmail}
              onChange={(e) => setFormData({ ...formData, contactEmail: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Telefone do Contato
          </label>
          <input
            type="tel"
            value={formData.contactPhone}
            onChange={(e) => setFormData({ ...formData, contactPhone: e.target.value })}
            placeholder="(00) 00000-0000"
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
          />
        </div>

        {/* Erro */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4">
            <p className="text-sm text-red-600">{error}</p>
          </div>
        )}

        {/* Botões */}
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => navigate('/admin/credentials')}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Criando...
              </>
            ) : (
              <>
                <Building2 className="w-5 h-5" />
                Criar Credencial
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
```

### 6. Frontend - Service

#### Adicionar métodos ao credentialsService

**Arquivo:** `src/services/credentials.service.ts` (MODIFICAR)

```typescript
// Adicionar novo método
async getAllBrands(): Promise<Company[]> {
  const response = await api.get('/credentials/brands');
  return response.data;
}
```

### 7. Frontend - Rotas

#### Adicionar rotas admin

**Arquivo:** `src/App.tsx` ou `src/routes/index.tsx` (MODIFICAR)

```typescript
// Rotas do Admin
<Route path="/admin/credentials" element={<AdminCredentialsPage />} />
<Route path="/admin/credentials/new" element={<AdminCreateCredentialPage />} />
<Route path="/admin/credentials/:id" element={<AdminCredentialDetailPage />} />
<Route path="/admin/credentials/:id/documents" element={<DocumentValidationPage />} />
```

---

## 📊 Comparação: Marca vs Admin

### Fluxo de Criação de Credencial

```typescript
// MARCA cria credencial
POST /credentials
Headers: { Authorization: Bearer <jwt-marca> }
Body: {
  cnpj: "12.345.678/0001-90",
  tradeName: "Facção ABC",
  contactEmail: "contato@faccao.com"
  // brandId NÃO enviado - pega do JWT
}

// ADMIN cria credencial
POST /credentials
Headers: { Authorization: Bearer <jwt-admin> }
Body: {
  brandId: "uuid-da-marca-selecionada",  // ← OBRIGATÓRIO
  cnpj: "12.345.678/0001-90",
  tradeName: "Facção ABC",
  contactEmail: "contato@faccao.com"
}
```

### Dashboard de Visualização

```typescript
// MARCA lista credenciais
GET /credentials
Headers: { Authorization: Bearer <jwt-marca> }
Response: [
  // Apenas credenciais onde brandId = marca do JWT
  { id: "1", cnpj: "...", brandId: "marca-uuid" }
]

// ADMIN lista credenciais
GET /credentials?brandId=uuid-opcional
Headers: { Authorization: Bearer <jwt-admin> }
Response: [
  // TODAS as credenciais de TODAS as marcas
  { id: "1", cnpj: "...", brandId: "marca-1-uuid", brand: { ... } },
  { id: "2", cnpj: "...", brandId: "marca-2-uuid", brand: { ... } },
  // ...
]
```

---

## ✅ Checklist de Implementação

### Backend
- [ ] Criar `AdminGuard` em `backend/src/common/guards/admin.guard.ts`
- [ ] Criar `AdminOrBrandGuard` em `backend/src/common/guards/admin-or-brand.guard.ts`
- [ ] Modificar `CreateCredentialDto` para incluir `brandId?: string`
- [ ] Modificar `CredentialsService.create()` para detectar role e usar brandId apropriado
- [ ] Modificar `CredentialsService.findAll()` para admin ver todas, brand ver apenas suas
- [ ] Modificar `CredentialsService.validateDocument()` para permitir admin validar
- [ ] Adicionar método `CredentialsService.getAllBrands()`
- [ ] Modificar `CredentialsController` para usar `AdminOrBrandGuard` nos endpoints
- [ ] Adicionar endpoint `GET /credentials/brands` com `AdminGuard`
- [ ] Testar permissões com tokens de admin e brand

### Frontend
- [ ] Criar `AdminCredentialsPage.tsx` (lista com filtros)
- [ ] Criar `AdminCreateCredentialPage.tsx` (form com seleção de marca)
- [ ] Criar `AdminCredentialDetailPage.tsx` (detalhes + ações)
- [ ] Modificar `credentialsService.ts` para adicionar `getAllBrands()`
- [ ] Adicionar rotas admin em `App.tsx`
- [ ] Adicionar menu "Fornecedores" no sidebar admin
- [ ] Reutilizar `DocumentValidationPage` (já existe) para admin validar docs
- [ ] Testar fluxo completo: admin cria → valida → envia convite → fornecedor completa

### Testes
- [ ] Teste E2E: Admin cria credencial para Marca X
- [ ] Teste E2E: Admin valida documentos de fornecedor
- [ ] Teste E2E: Marca visualiza credencial criada por admin
- [ ] Teste unitário: AdminGuard rejeita usuário BRAND
- [ ] Teste unitário: AdminOrBrandGuard aceita ambos
- [ ] Teste integração: Admin lista credenciais de todas as marcas
- [ ] Teste integração: Brand lista apenas suas credenciais

---

## 🚀 Ordem de Implementação

### Dia 1: Backend Autorização (3-4h)
1. Criar guards (AdminGuard, AdminOrBrandGuard)
2. Modificar DTO (adicionar brandId opcional)
3. Modificar CredentialsService (create, findAll, validateDocument)
4. Modificar CredentialsController (trocar guards)
5. Testar com Insomnia/Postman

### Dia 2: Backend Endpoints + Frontend Base (4-5h)
1. Adicionar endpoint `/credentials/brands`
2. Adicionar método `getAllBrands()` no service
3. Criar service frontend `credentialsService.getAllBrands()`
4. Criar `AdminCredentialsPage` (lista básica)
5. Adicionar rotas no App.tsx

### Dia 3: Frontend Formulários (4-5h)
1. Criar `AdminCreateCredentialPage` (form completo)
2. Integrar busca de CNPJ
3. Integrar seleção de marca
4. Reutilizar `DocumentValidationPage` para admin
5. Adicionar filtros na lista

### Dia 4: Testes e Refinamento (2-3h)
1. Testes E2E completos
2. Ajustar estilos e UX
3. Adicionar loading states
4. Testar permissões
5. Documentação

---

## 📝 Notas Importantes

1. **Backward Compatibility:** As mudanças são 100% compatíveis com fluxo existente de marcas. Marcas continuam funcionando exatamente como antes.

2. **Permissões Granulares:** Admin pode ver/modificar tudo, mas marca só vê/modifica suas próprias credenciais.

3. **Auditoria:** Todos os campos de validação mantêm `validatedById` para rastrear se foi marca ou admin que validou.

4. **Reuso de Código:** Reaproveitamos 100% do wizard de onboarding, geração de contrato, validação de docs. Nada precisa ser duplicado.

5. **Escalabilidade:** Estrutura permite adicionar mais roles no futuro (ex: OPERATOR, ANALYST).

---

## ✅ Resultado Esperado

Após implementação completa:

**Admin pode:**
- ✅ Ver dashboard com TODAS as credenciais (todas as marcas)
- ✅ Criar nova credencial selecionando marca de destino
- ✅ Validar CNPJ e enviar convite
- ✅ Validar documentos de qualquer fornecedor
- ✅ Ativar fornecedor manualmente se necessário
- ✅ Filtrar credenciais por marca, status, CNPJ

**Marca continua podendo:**
- ✅ Ver apenas suas próprias credenciais
- ✅ Criar novas credenciais (sem selecionar marca)
- ✅ Validar documentos de seus fornecedores
- ✅ Tudo que já fazia antes

**Fornecedor:**
- ✅ Não nota diferença - recebe convite igual
- ✅ Faz onboarding de 6 steps igual
- ✅ Assina contrato igual
- ✅ É ativado igual

---

**Estimativa Total:** 3-4 dias de implementação
**Complexidade:** Média
**Risco:** Baixo (mudanças isoladas e backward-compatible)
