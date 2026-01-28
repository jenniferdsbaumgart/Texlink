# Credential Components

Componentes reutilizáveis para o sistema de credenciamento de fornecedores.

## Componentes

### 1. CredentialCard

Card que exibe informações resumidas de uma credencial.

**Props:**
- `credential`: Objeto com dados da credencial (id, cnpj, tradeName, legalName, status, createdAt, internalCode, category)
- `onClick`: Função chamada ao clicar no card
- `actions`: Array de ações contextuais (menu dropdown)
- `className`: Classes CSS adicionais

**Exemplo:**

```tsx
import { CredentialCard } from '@/components/credentials';
import { Eye, Edit, Trash } from 'lucide-react';

<CredentialCard
  credential={{
    id: '123',
    cnpj: '12345678000190',
    tradeName: 'Confecções Silva',
    status: 'ACTIVE',
    createdAt: '2024-01-15',
    internalCode: 'SUP-001',
    category: 'Costura',
  }}
  onClick={() => router.push(`/credentials/${id}`)}
  actions={[
    {
      label: 'Visualizar',
      icon: <Eye className="h-4 w-4" />,
      onClick: () => handleView(),
    },
    {
      label: 'Editar',
      icon: <Edit className="h-4 w-4" />,
      onClick: () => handleEdit(),
    },
    {
      label: 'Excluir',
      icon: <Trash className="h-4 w-4" />,
      onClick: () => handleDelete(),
      variant: 'danger',
    },
  ]}
/>
```

### 2. TimelineStatus

Timeline horizontal mostrando o progresso do credenciamento.

**Props:**
- `currentStatus`: Status atual da credencial
- `history`: Array com histórico de mudanças de status (opcional)
- `className`: Classes CSS adicionais

**Exemplo:**

```tsx
import { TimelineStatus } from '@/components/credentials';

<TimelineStatus
  currentStatus="COMPLIANCE_APPROVED"
  history={[
    { status: 'DRAFT', createdAt: '2024-01-01' },
    { status: 'VALIDATING', createdAt: '2024-01-02' },
    { status: 'COMPLIANCE_APPROVED', createdAt: '2024-01-05' },
  ]}
/>
```

**Estados da Timeline:**
1. DRAFT (Rascunho)
2. VALIDATING (Validação)
3. COMPLIANCE (Compliance)
4. APPROVED (Aprovado)
5. INVITED (Convidado)
6. ACTIVE (Ativo)

### 3. ValidationResultCard

Card que exibe os resultados de uma validação de CNPJ.

**Props:**
- `validation`: Objeto com dados da validação
- `className`: Classes CSS adicionais

**Exemplo:**

```tsx
import { ValidationResultCard } from '@/components/credentials';

<ValidationResultCard
  validation={{
    id: '123',
    isValid: true,
    source: 'RECEITA_FEDERAL',
    validatedAt: '2024-01-15',
    parsedData: {
      razaoSocial: 'CONFECÇÕES SILVA LTDA',
      nomeFantasia: 'Silva Confecções',
      endereco: {
        logradouro: 'Rua das Flores',
        numero: '123',
        bairro: 'Centro',
        cidade: 'São Paulo',
        estado: 'SP',
        cep: '01234-567',
      },
      situacaoCadastral: 'ATIVA',
    },
    companyStatus: 'ATIVA',
    foundedAt: '2010-05-20',
    capitalStock: 100000,
    companyType: 'LTDA',
    mainActivity: 'Confecção de peças do vestuário',
  }}
/>
```

### 4. ComplianceScore

Exibe scores de compliance com barras visuais.

**Props:**
- `creditScore`: Score de crédito (0-100, opcional)
- `fiscalScore`: Score fiscal (0-100, opcional)
- `overallScore`: Score geral (0-100, opcional)
- `showDetails`: Mostrar scores individuais (padrão: true)
- `className`: Classes CSS adicionais

**Exemplo:**

```tsx
import { ComplianceScore } from '@/components/credentials';

<ComplianceScore
  overallScore={85}
  creditScore={90}
  fiscalScore={80}
  showDetails={true}
/>
```

**Classificação de Scores:**
- 81-100: Excelente (azul)
- 61-80: Bom (verde)
- 31-60: Regular (amarelo)
- 0-30: Baixo (vermelho)

### 5. RiskLevelIndicator

Badge que indica o nível de risco.

**Props:**
- `riskLevel`: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
- `size`: 'sm' | 'md' | 'lg' (padrão: 'md')
- `showLabel`: Mostrar texto do label (padrão: true)
- `showIcon`: Mostrar ícone (padrão: true)
- `className`: Classes CSS adicionais

**Exemplo:**

```tsx
import { RiskLevelIndicator, RiskLevelCard, RiskLevelGrid } from '@/components/credentials';

// Badge simples
<RiskLevelIndicator riskLevel="LOW" />

// Card expandido com descrição
<RiskLevelCard riskLevel="HIGH" />

// Grid para seleção
<RiskLevelGrid
  selectedRisk="MEDIUM"
  onSelect={(risk) => setRisk(risk)}
/>
```

**Níveis de Risco:**
- LOW: Verde - Aprovado para credenciamento
- MEDIUM: Amarelo - Requer atenção
- HIGH: Laranja - Análise manual recomendada
- CRITICAL: Vermelho - Não recomendado

## Uso Combinado

Exemplo de página de detalhes de credencial usando todos os componentes:

```tsx
import {
  CredentialCard,
  TimelineStatus,
  ValidationResultCard,
  ComplianceScore,
  RiskLevelCard,
} from '@/components/credentials';

export default function CredentialDetailsPage({ credential, validation, compliance }) {
  return (
    <div className="space-y-6">
      {/* Timeline do processo */}
      <TimelineStatus
        currentStatus={credential.status}
        history={credential.statusHistory}
      />

      <div className="grid grid-cols-2 gap-6">
        {/* Validação CNPJ */}
        <ValidationResultCard validation={validation} />

        {/* Scores de Compliance */}
        <ComplianceScore
          overallScore={compliance.overallScore}
          creditScore={compliance.creditScore}
          fiscalScore={compliance.taxScore}
        />
      </div>

      {/* Nível de Risco */}
      <RiskLevelCard riskLevel={compliance.riskLevel} />
    </div>
  );
}
```

## Integração com Backend

Todos os tipos são baseados no schema Prisma:

- `SupplierCredential` → `CredentialCard`
- `CredentialStatusHistory` → `TimelineStatus`
- `CredentialValidation` → `ValidationResultCard`
- `ComplianceAnalysis` → `ComplianceScore` + `RiskLevelIndicator`

## Dependências

- Tailwind CSS para estilização
- Lucide Icons para ícones
- StatusBadge (componente compartilhado existente)
