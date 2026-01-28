# Módulo de Integrações

## Visão Geral

O módulo de integrações centraliza toda comunicação com APIs e serviços externos, fornecendo uma camada de abstração consistente e tolerante a falhas.

## Arquitetura

```
┌─────────────────────────────────────────┐
│       IntegrationService                │
│  (Orchestrator & Fallback Handler)      │
└────────────┬────────────────────────────┘
             │
    ┌────────┴────────┬──────────┬────────────┐
    │                 │          │            │
┌───▼──────┐  ┌──────▼───┐  ┌──▼────┐  ┌────▼────┐
│   CNPJ   │  │  Credit  │  │ Email │  │WhatsApp │
│Providers │  │ Providers│  │Sender │  │ Sender  │
└──────────┘  └──────────┘  └───────┘  └─────────┘
    │              │            │            │
┌───┴───┐      ┌───┴───┐   ┌───┴───┐   ┌────┴────┐
│Brasil │      │ Mock  │   │Send   │   │  Twilio │
│  API  │      │Credit │   │ Grid  │   │         │
└───────┘      └───────┘   └───────┘   └─────────┘
    │
┌───┴───┐
│Receita│
│  WS   │
└───────┘
```

## Providers Disponíveis

### 1. CNPJ Validation Providers

#### Brasil API (Preferencial)

```typescript
// Config
BRASIL_API_BASE_URL="https://brasilapi.com.br/api"
BRASIL_API_TIMEOUT=10000

// Uso
const result = await brasilApiProvider.validateCNPJ("12345678000195");

// Response
{
  cnpj: "12345678000195",
  legalName: "EMPRESA EXEMPLO LTDA",
  tradeName: "Empresa Exemplo",
  taxSituation: "ATIVA",
  foundationDate: "2020-01-15",
  mainActivity: {
    code: "4751-2/01",
    description: "Comércio varejista especializado de..."
  },
  address: {
    street: "Rua Exemplo",
    number: "123",
    complement: "Sala 456",
    neighborhood: "Centro",
    city: "São Paulo",
    state: "SP",
    zipCode: "01234-567"
  },
  phone: "(11) 1234-5678",
  email: "contato@exemplo.com.br",
  legalNature: "206-2 - SOCIEDADE EMPRESÁRIA LIMITADA",
  share_capital: 100000.00
}
```

#### ReceitaWS (Fallback)

```typescript
// Config
RECEITAWS_BASE_URL="https://www.receitaws.com.br/v1"
RECEITAWS_API_KEY="optional-for-premium"
RECEITAWS_TIMEOUT=15000

// Rate Limits (Free tier)
- 3 requests/minute
- Automatic retry após 60s

// Uso
const result = await receitaWsProvider.validateCNPJ("12345678000195");

// Response (similar structure)
```

### 2. Credit Analysis Providers

#### Mock Credit Provider (Desenvolvimento)

```typescript
// Simula análise de crédito para testes
const analysis = await mockCreditProvider.analyzeCNPJ("12345678000195");

// Response
{
  cnpj: "12345678000195",
  creditScore: 750,              // 0-1000
  riskLevel: "LOW",              // LOW | MEDIUM | HIGH | CRITICAL
  overallScore: 85,              // 0-100
  analysis: {
    paymentHistory: {
      onTime: 95,                // % pagamentos em dia
      avgDelayDays: 2,
      hasDefaults: false
    },
    financialHealth: {
      revenue: 5000000,          // Faturamento anual
      profitMargin: 15,          // %
      debtRatio: 30              // %
    },
    legalIssues: {
      hasLawsuits: false,
      activeLawsuits: 0,
      totalValue: 0
    },
    marketPresence: {
      yearsInBusiness: 4,
      employees: 50,
      hasWebsite: true
    }
  },
  recommendation: "APPROVE",     // APPROVE | REJECT | MANUAL_REVIEW
  confidence: 0.92,              // 0-1
  analyzedAt: "2025-01-27T10:00:00Z"
}
```

#### Serasa Experian (Futuro)

```typescript
// Config
SERASA_API_URL="https://api.serasaexperian.com.br"
SERASA_API_KEY="your-api-key"
SERASA_API_SECRET="your-secret"

// Consultas disponíveis
- Consulta Básica (Score)
- Consulta Completa (Score + Histórico)
- Cheque sem Fundo
- Protestos
- Ações Judiciais
- Falências e Concordatas
```

#### Boa Vista SCPC (Futuro)

```typescript
// Config
BOAVISTA_API_URL="https://api.boavista.com.br"
BOAVISTA_CLIENT_ID="your-client-id"
BOAVISTA_CLIENT_SECRET="your-secret"

// Consultas disponíveis
- Restrições Financeiras
- Cheques sem Fundo
- CCF - Cadastro de Emitentes de Cheques sem Fundos
- Protestos
- Consulta Score
```

### 3. Notification Providers

#### SendGrid (Email)

```typescript
// Config
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@texlink.com"
SENDGRID_FROM_NAME="Texlink Platform"

// Templates
const templates = {
  credentialInvitation: "d-xxx",
  orderCreated: "d-xxx",
  orderStatusUpdate: "d-xxx",
  paymentReceived: "d-xxx"
};

// Uso
await sendGridProvider.sendEmail({
  to: "supplier@example.com",
  subject: "Convite de Credenciamento - Texlink",
  templateId: templates.credentialInvitation,
  dynamicTemplateData: {
    brandName: "Marca Exemplo",
    invitationToken: "abc123",
    expiresAt: "2025-02-03",
    acceptUrl: "https://texlink.com/accept/abc123"
  }
});
```

#### Twilio (WhatsApp & SMS)

```typescript
// Config
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="your-token"
TWILIO_WHATSAPP_FROM="whatsapp:+5511999999999"
TWILIO_SMS_FROM="+5511999999999"

// WhatsApp
await twilioProvider.sendWhatsApp({
  to: "whatsapp:+5511988887777",
  body: `Olá! Você recebeu um convite de credenciamento da Marca Exemplo.

Clique no link para aceitar:
https://texlink.com/accept/abc123

O convite expira em 7 dias.`
});

// SMS
await twilioProvider.sendSMS({
  to: "+5511988887777",
  body: "Seu código de verificação Texlink: 123456"
});
```

## IntegrationService (Orquestrador)

### Validação de CNPJ com Fallback

```typescript
/**
 * Valida CNPJ tentando providers na ordem:
 * 1. Brasil API (preferencial)
 * 2. ReceitaWS (fallback)
 */
async validateCNPJ(cnpj: string): Promise<CNPJValidationResult> {
  try {
    // Tenta Brasil API primeiro
    return await this.brasilApiProvider.validateCNPJ(cnpj);
  } catch (error) {
    this.logger.warn('Brasil API failed, trying ReceitaWS', error);

    try {
      // Fallback para ReceitaWS
      return await this.receitaWsProvider.validateCNPJ(cnpj);
    } catch (fallbackError) {
      this.logger.error('All CNPJ providers failed', fallbackError);
      throw new ServiceUnavailableException(
        'Não foi possível validar o CNPJ no momento. Tente novamente em alguns minutos.'
      );
    }
  }
}
```

### Análise de Crédito

```typescript
/**
 * Realiza análise de crédito completa
 */
async analyzeCreditRisk(cnpj: string): Promise<CreditAnalysisResult> {
  const results = await Promise.allSettled([
    this.serasaProvider?.getScore(cnpj),
    this.boaVistaProvider?.checkRestrictions(cnpj),
    this.jusbrasil?.searchLawsuits(cnpj),
  ]);

  // Agrega resultados de múltiplas fontes
  return this.aggregateCreditAnalysis(results);
}
```

### Envio de Convites Multi-canal

```typescript
/**
 * Envia convite por email + WhatsApp simultaneamente
 */
async sendCredentialInvitation(params: {
  email: string;
  phone?: string;
  brandName: string;
  token: string;
}): Promise<{ emailSent: boolean; whatsappSent: boolean }> {
  const promises = [];

  // Email sempre enviado
  promises.push(
    this.sendGridProvider.sendEmail({
      to: params.email,
      templateId: 'credential-invitation',
      data: params
    })
  );

  // WhatsApp opcional
  if (params.phone) {
    promises.push(
      this.twilioProvider.sendWhatsApp({
        to: params.phone,
        body: this.buildInvitationMessage(params)
      })
    );
  }

  const results = await Promise.allSettled(promises);

  return {
    emailSent: results[0].status === 'fulfilled',
    whatsappSent: results[1]?.status === 'fulfilled' || false
  };
}
```

## Tratamento de Erros

### Retry Strategy

```typescript
const retryConfig = {
  attempts: 3,
  delay: 1000,        // 1s
  backoff: 2,         // Exponential: 1s, 2s, 4s
  timeout: 30000      // 30s total
};
```

### Circuit Breaker

```typescript
// Abre circuito após 5 falhas consecutivas
const circuitBreakerConfig = {
  threshold: 5,
  timeout: 60000,     // Reabre após 1 minuto
  resetTimeout: 30000 // Reseta contador após 30s de sucesso
};
```

### Error Handling

```typescript
try {
  await integrationService.validateCNPJ(cnpj);
} catch (error) {
  if (error instanceof TimeoutError) {
    // Timeout específico (30s)
    return { error: 'timeout', retry: true };
  }

  if (error instanceof RateLimitError) {
    // Rate limit atingido
    return { error: 'rate_limit', retryAfter: error.retryAfter };
  }

  if (error instanceof ValidationError) {
    // CNPJ inválido
    return { error: 'invalid_cnpj', message: error.message };
  }

  if (error instanceof ServiceUnavailableException) {
    // Todos os providers falharam
    return { error: 'service_unavailable', retry: true };
  }
}
```

## Monitoramento e Logs

### Métricas

```typescript
// Prometheus metrics
integration_request_total{provider="brasil_api", status="success"}
integration_request_duration_seconds{provider="brasil_api", p95="0.5"}
integration_errors_total{provider="brasil_api", error_type="timeout"}
integration_circuit_breaker_state{provider="brasil_api", state="open"}
```

### Logs Estruturados

```typescript
{
  timestamp: "2025-01-27T10:00:00Z",
  level: "info",
  service: "integrations",
  provider: "brasil_api",
  operation: "validate_cnpj",
  cnpj: "12345678000195",  // Mascarado em produção
  duration: 523,            // ms
  success: true
}
```

## Cache Strategy

### Redis Cache

```typescript
// Cache de CNPJs validados (TTL: 30 dias)
const cacheKey = `cnpj:validated:${cnpj}`;
const cached = await redis.get(cacheKey);

if (cached) {
  return JSON.parse(cached);
}

const result = await integrationService.validateCNPJ(cnpj);
await redis.setex(cacheKey, 30 * 24 * 60 * 60, JSON.stringify(result));
return result;
```

### Invalidação de Cache

```typescript
// Invalida cache quando CNPJ é atualizado
await redis.del(`cnpj:validated:${cnpj}`);
```

## Testes

### Unit Tests

```typescript
describe('BrasilApiProvider', () => {
  it('should validate valid CNPJ', async () => {
    const result = await provider.validateCNPJ('12345678000195');
    expect(result.cnpj).toBe('12345678000195');
    expect(result.legalName).toBeDefined();
  });

  it('should throw on invalid CNPJ', async () => {
    await expect(
      provider.validateCNPJ('00000000000000')
    ).rejects.toThrow(ValidationError);
  });

  it('should timeout after 10s', async () => {
    // Mock slow response
    await expect(
      provider.validateCNPJ('12345678000195', { timeout: 100 })
    ).rejects.toThrow(TimeoutError);
  });
});
```

### Integration Tests

```typescript
describe('IntegrationService', () => {
  it('should fallback to ReceitaWS when Brasil API fails', async () => {
    // Mock Brasil API to fail
    jest.spyOn(brasilApi, 'validateCNPJ').mockRejectedValue(new Error());

    const result = await service.validateCNPJ('12345678000195');

    expect(result).toBeDefined();
    expect(receitaWs.validateCNPJ).toHaveBeenCalled();
  });
});
```

### E2E Tests

```bash
# Testes contra APIs reais (staging/sandbox)
npm run test:e2e -- integrations.e2e-spec.ts
```

## Rate Limits

| Provider | Free Tier | Paid Tier |
|----------|-----------|-----------|
| Brasil API | Sem limite | - |
| ReceitaWS | 3/min | 100/min |
| Serasa | - | 1000/dia |
| Boa Vista | - | 500/dia |
| SendGrid | 100/dia | ilimitado |
| Twilio | $15 crédito | pay-as-you-go |

## Custos Estimados

### Volume Mensal: 1000 credenciamentos

| Serviço | Uso | Custo Mensal |
|---------|-----|--------------|
| Brasil API | 1000 validações | R$ 0,00 (gratuito) |
| ReceitaWS | 100 validações (fallback) | R$ 0,00 (free tier) |
| SendGrid | 1000 emails | R$ 0,00 (free 100/dia) |
| Twilio WhatsApp | 500 mensagens | R$ ~125,00 (R$ 0,25/msg) |
| Serasa | 800 consultas | R$ ~2.400,00 (R$ 3,00/consulta) |
| **TOTAL** | | **R$ ~2.525,00/mês** |

## Configuração

### Variáveis de Ambiente

```bash
# CNPJ Validation
BRASIL_API_BASE_URL=https://brasilapi.com.br/api
BRASIL_API_TIMEOUT=10000
RECEITAWS_BASE_URL=https://www.receitaws.com.br/v1
RECEITAWS_API_KEY=optional
RECEITAWS_TIMEOUT=15000

# Credit Analysis
SERASA_API_URL=https://api.serasaexperian.com.br
SERASA_API_KEY=your-key
SERASA_API_SECRET=your-secret
BOAVISTA_API_URL=https://api.boavista.com.br
BOAVISTA_CLIENT_ID=your-client-id
BOAVISTA_CLIENT_SECRET=your-secret

# Email
SENDGRID_API_KEY=SG.xxx
SENDGRID_FROM_EMAIL=noreply@texlink.com
SENDGRID_FROM_NAME=Texlink Platform

# WhatsApp & SMS
TWILIO_ACCOUNT_SID=ACxxx
TWILIO_AUTH_TOKEN=your-token
TWILIO_WHATSAPP_FROM=whatsapp:+5511999999999
TWILIO_SMS_FROM=+5511999999999

# Redis (Cache)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=optional
```

## Roadmap

### Q1 2026
- ✅ Brasil API integration
- ✅ ReceitaWS integration
- ✅ SendGrid integration
- ✅ Twilio integration
- ⏳ Redis caching

### Q2 2026
- 📅 Serasa integration
- 📅 Boa Vista SCPC integration
- 📅 Circuit breaker implementation
- 📅 Prometheus metrics

### Q3 2026
- 📅 Jusbrasil API (processos jurídicos)
- 📅 Webhook listeners
- 📅 Batch processing para análises
- 📅 ML-based risk scoring

## Troubleshooting

### Brasil API não responde

1. Verificar status: https://status.brasilapi.com.br
2. Usar ReceitaWS como alternativa
3. Implementar cache para reduzir chamadas

### Rate limit excedido

1. Implementar cache Redis
2. Usar tier pago da API
3. Queue de processos com backoff

### SendGrid emails não chegam

1. Verificar configuração SPF/DKIM
2. Confirmar domínio verificado
3. Checar logs de bounce/spam

### Twilio não envia WhatsApp

1. Verificar número aprovado pela Twilio
2. Confirmar template de mensagem aprovado
3. Validar formato do número (E.164)
