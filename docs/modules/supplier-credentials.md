# Sistema de Credenciamento de Fornecedores

## Visão Geral

O sistema de credenciamento gerencia todo o ciclo de vida do relacionamento entre marcas e facções, desde o primeiro contato até a ativação completa do fornecedor na plataforma.

## Fluxo do Credenciamento

```
┌──────────────┐
│    DRAFT     │  Marca cadastra CNPJ e dados de contato
└──────┬───────┘
       │
       v
┌──────────────────────┐
│ VALIDATION_PENDING   │  Sistema inicia validação automática
└──────┬───────────────┘
       │
       ├─[Sucesso]──> VALIDATION_SUCCESS
       │
       └─[Falha]────> VALIDATION_FAILED (volta para DRAFT)

┌──────────────────────┐
│ VALIDATION_SUCCESS   │  Marca pode enviar convite
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│  INVITATION_SENT     │  Convite enviado por email/WhatsApp
└──────┬───────────────┘
       │
       ├─[Facção abre]──> INVITATION_OPENED
       │
       └─[7 dias]──────> INVITATION_EXPIRED (permite reenvio)

┌──────────────────────┐
│  INVITATION_OPENED   │  Facção visualizou o convite
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│ ONBOARDING_STARTED   │  Facção iniciou cadastro
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│ ONBOARDING_PROGRESS  │  Cadastro em andamento
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│ ONBOARDING_COMPLETE  │  Cadastro concluído
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│  COMPLIANCE_PENDING  │  Análise automática iniciada
└──────┬───────────────┘
       │
       ├─[Aprovado]──> COMPLIANCE_APPROVED
       │
       └─[Rejeitado]─> COMPLIANCE_REJECTED

┌──────────────────────┐
│ COMPLIANCE_APPROVED  │  Aguarda aprovação final da marca
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│  CONTRACT_PENDING    │  Geração de contrato
└──────┬───────────────┘
       │
       v
┌──────────────────────┐
│      ACTIVE          │  ✅ Facção ativa na plataforma
└──────────────────────┘
```

## Estados do Credenciamento

| Status | Descrição | Pode Editar | Pode Remover | Próxima Ação |
|--------|-----------|-------------|--------------|--------------|
| `DRAFT` | Rascunho inicial | ✅ Sim | ✅ Sim | Validar CNPJ |
| `VALIDATION_PENDING` | Validando CNPJ | ❌ Não | ❌ Não | Automático |
| `VALIDATION_FAILED` | Validação falhou | ✅ Sim | ✅ Sim | Corrigir CNPJ |
| `VALIDATION_SUCCESS` | CNPJ validado | ❌ Não | ❌ Não | Enviar convite |
| `INVITATION_PENDING` | Aguardando envio | ❌ Não | ✅ Sim | Enviar convite |
| `INVITATION_SENT` | Convite enviado | ❌ Não | ❌ Não | Aguardar facção |
| `INVITATION_OPENED` | Convite aberto | ❌ Não | ❌ Não | Aguardar facção |
| `INVITATION_EXPIRED` | Convite expirado | ❌ Não | ✅ Sim | Reenviar convite |
| `ONBOARDING_STARTED` | Cadastro iniciado | ❌ Não | ❌ Não | Aguardar facção |
| `ONBOARDING_IN_PROGRESS` | Cadastro em andamento | ❌ Não | ❌ Não | Aguardar facção |
| `ONBOARDING_COMPLETE` | Cadastro completo | ❌ Não | ❌ Não | Análise compliance |
| `COMPLIANCE_PENDING` | Em análise | ❌ Não | ❌ Não | Automático |
| `COMPLIANCE_APPROVED` | Compliance OK | ❌ Não | ❌ Não | Aprovar marca |
| `COMPLIANCE_REJECTED` | Compliance reprovado | ✅ Sim | ✅ Sim | Revisar dados |
| `CONTRACT_PENDING` | Aguarda contrato | ❌ Não | ❌ Não | Assinar contrato |
| `ACTIVE` | ✅ Ativo | ❌ Não | ❌ Não | Operar normalmente |
| `BLOCKED` | 🚫 Bloqueado | ❌ Não | ❌ Não | - |

## Estrutura de Dados

### SupplierCredential

```typescript
{
  id: string                        // UUID
  cnpj: string                      // 14 dígitos (apenas números)
  tradeName: string?                // Nome fantasia (preenchido após validação)
  legalName: string?                // Razão social (preenchido após validação)
  contactName: string               // Nome do contato
  contactEmail: string              // Email do contato
  contactPhone: string              // Telefone (apenas números)
  contactWhatsapp: string?          // WhatsApp (opcional)
  internalCode: string?             // Código interno da marca
  category: string?                 // Categoria (ex: "Malharia", "Costura")
  notes: string?                    // Observações internas
  priority: number                  // Prioridade (0-10)
  status: SupplierCredentialStatus  // Status atual

  // Relacionamentos
  brandId: string                   // Marca que criou
  supplierId: string?               // Facção associada (após ativação)
  createdById: string               // Usuário que criou

  // Timestamps
  createdAt: DateTime
  updatedAt: DateTime
  completedAt: DateTime?            // Quando chegou a ACTIVE

  // Relacionamentos
  validations: CredentialValidation[]
  compliance: SupplierCompliance?
  invitations: CredentialInvitation[]
  onboarding: SupplierOnboarding?
  contract: SupplierContract?
  statusHistory: CredentialStatusHistory[]
}
```

### CredentialValidation

Histórico de validações de CNPJ realizadas:

```typescript
{
  id: string
  credentialId: string

  // Resultado da validação
  isValid: boolean
  provider: string                  // "BRASIL_API" | "RECEITA_WS"

  // Dados retornados
  legalName: string?
  tradeName: string?
  taxSituation: string?
  foundationDate: DateTime?
  address: Json?                    // Endereço completo
  mainActivity: string?             // CNAE principal
  legalNature: string?

  // Metadados
  validatedAt: DateTime
  responseTime: number              // Tempo de resposta em ms
  rawResponse: Json                 // Response completo da API

  // Em caso de erro
  error: string?
}
```

### SupplierCompliance

Análise de compliance e risco:

```typescript
{
  id: string
  credentialId: string

  // Scores
  creditScore: number?              // 0-1000 (ex: Serasa)
  riskLevel: string                 // "LOW" | "MEDIUM" | "HIGH" | "CRITICAL"
  overallScore: number              // 0-100 (score interno)

  // Análises individuais
  creditAnalysis: Json?             // Análise de crédito completa
  legalAnalysis: Json?              // Consulta de processos jurídicos
  financialAnalysis: Json?          // Análise financeira

  // Decisão
  isApproved: boolean
  rejectionReason: string?
  notes: string?

  // Metadata
  analyzedAt: DateTime
  reviewedById: string?             // Usuário que revisou (se manual)
  reviewedAt: DateTime?
}
```

### CredentialInvitation

Convites enviados para a facção:

```typescript
{
  id: string
  credentialId: string

  // Convite
  token: string                     // Token único para aceitar convite
  channel: string                   // "EMAIL" | "WHATSAPP" | "SMS"
  recipientEmail: string?
  recipientPhone: string?

  // Status
  status: string                    // "PENDING" | "SENT" | "OPENED" | "ACCEPTED" | "EXPIRED"
  sentAt: DateTime?
  openedAt: DateTime?
  acceptedAt: DateTime?
  expiresAt: DateTime               // Expira em 7 dias

  // Tracking
  openCount: number                 // Quantas vezes foi aberto
  lastOpenedAt: DateTime?
  ipAddress: string?                // IP de quem abriu
  userAgent: string?                // Browser info

  // Metadados
  sentById: string                  // Quem enviou
  messageId: string?                // ID do email/mensagem enviado
}
```

## API Endpoints

### CRUD Básico

```typescript
POST   /credentials                    // Criar novo credenciamento
GET    /credentials                    // Listar com filtros e paginação
GET    /credentials/:id                // Buscar por ID
PATCH  /credentials/:id                // Atualizar (apenas status editáveis)
DELETE /credentials/:id                // Remover (soft delete via BLOCKED)
```

### Validação

```typescript
POST   /credentials/:id/validate       // Iniciar validação de CNPJ
GET    /credentials/:id/validation-history  // Histórico de validações
```

### Convites

```typescript
POST   /credentials/:id/send-invitation      // Enviar convite
POST   /credentials/:id/resend-invitation    // Reenviar convite
GET    /credentials/:id/invitations          // Listar convites enviados
GET    /credentials/accept/:token            // Aceitar convite (público)
```

### Compliance

```typescript
POST   /credentials/:id/analyze-compliance   // Iniciar análise
GET    /credentials/:id/compliance           // Ver resultado da análise
PATCH  /credentials/:id/compliance           // Revisar manualmente
```

### Outros

```typescript
GET    /credentials/stats                    // Estatísticas gerais
GET    /credentials/:id/history              // Histórico de status
PATCH  /credentials/:id/status               // Mudar status manualmente
```

## Filtros e Busca

### Query Parameters

```typescript
{
  // Busca multi-campo
  search?: string              // Busca em CNPJ, razão social, nome fantasia, contato

  // Filtros
  status?: SupplierCredentialStatus
  statuses?: SupplierCredentialStatus[]  // Múltiplos status
  category?: string
  createdFrom?: string         // ISO date
  createdTo?: string           // ISO date

  // Paginação
  page?: number                // Default: 1
  limit?: number               // Default: 20, Max: 100

  // Ordenação
  sortBy?: string              // Default: "createdAt"
  sortOrder?: "asc" | "desc"   // Default: "desc"
}
```

### Response de Listagem

```typescript
{
  data: SupplierCredential[],
  meta: {
    page: number,
    limit: number,
    total: number,
    totalPages: number,
    hasNextPage: boolean,
    hasPreviousPage: boolean
  }
}
```

## Validações de Negócio

### Criação

- ✅ CNPJ deve ter 14 dígitos
- ✅ CNPJ não pode estar duplicado para a mesma marca (exceto BLOCKED)
- ✅ Email deve ser válido
- ✅ Telefones devem ter 10-11 dígitos

### Atualização

- ✅ Apenas status `DRAFT`, `VALIDATION_FAILED`, `COMPLIANCE_REJECTED` podem ser editados
- ✅ Se CNPJ mudou, reseta validações e volta para `DRAFT`
- ✅ Não pode duplicar CNPJ de outro credenciamento ativo

### Remoção

- ✅ Apenas status `DRAFT`, `VALIDATION_FAILED`, `COMPLIANCE_REJECTED`, `INVITATION_EXPIRED` podem ser removidos
- ✅ Remoção é soft delete (status → `BLOCKED`)
- ✅ Mantém histórico para auditoria

## Integrações

### Validação de CNPJ

1. **Brasil API** (preferencial)
   - Gratuita
   - Boa cobertura
   - Timeout: 10s

2. **ReceitaWS** (fallback)
   - Gratuita (com rate limit)
   - Boa confiabilidade
   - Timeout: 15s

### Análise de Compliance (Futuro)

- **Serasa Experian**: Score de crédito
- **Boa Vista SCPC**: Consulta de restrições
- **Jusbrasil API**: Processos jurídicos

### Notificações

- **Email**: SendGrid para convites e notificações
- **WhatsApp**: Twilio para convites via WhatsApp
- **SMS**: Twilio para notificações críticas

## Estatísticas

### Dashboard de Credenciamentos

```typescript
{
  total: number,                    // Total de credenciamentos
  byStatus: {
    [status: string]: number        // Contagem por status
  },
  thisMonth: {
    created: number,                // Criados este mês
    completed: number               // Completados este mês (ACTIVE)
  },
  pendingAction: number,            // Que precisam de ação da marca
  awaitingResponse: number,         // Aguardando resposta da facção
  activeCount: number,              // Total de ativos
  conversionRate: number            // % de conversão (ACTIVE / total)
}
```

## Segurança e Permissões

### Permissões Requeridas

| Ação | Permissão |
|------|-----------|
| Criar credenciamento | `CREATE_SUPPLIER` |
| Listar credenciamentos | `VIEW_SUPPLIERS` |
| Editar credenciamento | `EDIT_SUPPLIER` |
| Remover credenciamento | `REMOVE_SUPPLIER` |
| Enviar convite | `INVITE_SUPPLIER` |
| Análise manual | `ADMIN` ou `OPERATIONS_MANAGER` |

### Guards Aplicados

- `JwtAuthGuard`: Autenticação obrigatória
- `RolesGuard`: Valida role do usuário
- `BrandGuard`: Garante acesso apenas a credenciamentos da própria marca

## Auditoria

Todas as mudanças de status são registradas em `CredentialStatusHistory`:

```typescript
{
  id: string,
  credentialId: string,
  fromStatus: SupplierCredentialStatus?,
  toStatus: SupplierCredentialStatus,
  performedById: string,
  reason: string?,
  createdAt: DateTime
}
```

## Boas Práticas

1. **Sempre valide o CNPJ** antes de enviar convite
2. **Use soft delete** para remoções (status BLOCKED)
3. **Mantenha histórico completo** de validações e mudanças
4. **Configure retry** para integrações externas
5. **Implemente cache** para CNPJs já validados
6. **Use filas** (Bull/BullMQ) para processos longos
7. **Monitore timeouts** de APIs externas
8. **Log todas as operações** para auditoria

## Testes

### Testes Unitários

```bash
npm run test -- credentials.service.spec.ts
npm run test -- validation.service.spec.ts
npm run test -- compliance.service.spec.ts
```

### Testes de Integração

```bash
npm run test:e2e -- credentials.e2e-spec.ts
```

### Dados de Teste

Use o seed de demonstração:

```bash
npx tsx backend/prisma/demo-seed.ts
```

## Troubleshooting

### Validação de CNPJ falhando

1. Verifique se as APIs externas estão online
2. Confirme que o CNPJ tem 14 dígitos válidos
3. Verifique rate limits das APIs
4. Consulte logs de erro: `backend/logs/credentials.log`

### Convite não chegando

1. Verifique configuração SendGrid/Twilio
2. Confirme email/telefone estão corretos
3. Verifique spam/lixeira
4. Consulte logs de envio

### Performance lenta

1. Adicione índices no banco: `cnpj`, `brandId`, `status`, `createdAt`
2. Implemente cache Redis para CNPJs validados
3. Use filas para processamento assíncrono
4. Otimize queries com `include` seletivo
