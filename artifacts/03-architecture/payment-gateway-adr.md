# ADR-002: Payment Gateway Integration

> **Status:** Proposed
> **Date:** 2026-02-07
> **Deciders:** Tech Lead, Product Owner
> **Context:** Texlink Faccao Manager - B2B textile supply chain platform

---

## Context

The Texlink platform connects brands with textile suppliers (faccoes). Currently, payment tracking exists in the database (`payments` table with statuses PENDENTE, PARCIAL, PAGO, ATRASADO), but actual money movement is manual. We need a payment gateway to:

1. Process payments from brands to suppliers through the platform
2. Collect platform fees (split payments)
3. Support PIX (dominant payment method in Brazil) and boleto
4. Provide webhook-driven payment status updates
5. Handle supplier payouts automatically

### Requirements

| Requirement | Priority |
|------------|----------|
| PIX payments (instant) | P0 |
| Boleto bancario | P1 |
| Split payments (platform fee collection) | P0 |
| Webhook notifications for payment events | P0 |
| Node.js/NestJS SDK or REST API | P0 |
| Recurring/scheduled payments | P2 |
| Credit card payments | P2 |
| Transparent fees | P1 |
| Supplier payout automation | P1 |

---

## Options Evaluated

### 1. Asaas

**Profile:** B2B-focused Brazilian fintech, digital account + payments.

| Feature | Support |
|---------|---------|
| PIX | Native, R$1,99/transacao |
| Boleto | R$1,99/boleto pago |
| Credit Card | 2,99% + R$0,49 |
| Split Payments | Sim (fixed + percentage, unlimited wallets) |
| Webhooks | Completo |
| Recurring | Sim (subscription API) |
| Node.js SDK | Community (`asaas` npm) |
| Monthly Fee | Nenhuma |

**Strengths:**
- Built for B2B (accounts receivable management)
- Transparent, competitive fees
- Split + subscription combo in single API call
- Digital account for each supplier (simplifies payouts)
- No monthly fees

**Weaknesses:**
- Community SDK (no official Node.js package)
- Smaller brand vs. Mercado Pago

### 2. Mercado Pago

**Profile:** Largest LatAm payment platform (MercadoLibre ecosystem).

| Feature | Support |
|---------|---------|
| PIX | Native |
| Boleto | Sim |
| Credit Card | 2-5% range |
| Split Payments | Sim (Checkout Pro/Transparente) |
| Webhooks | Completo |
| Recurring | Sim (subscription API) |
| Node.js SDK | Oficial (`mercadopago` npm) |
| Monthly Fee | Nenhuma |

**Strengths:**
- Official Node.js SDK with TypeScript
- Strongest brand recognition in Brazil
- Mature marketplace split payment infrastructure
- Extensive documentation

**Weaknesses:**
- Fee structure less transparent (requires sales contact)
- B2C-oriented documentation
- Heavier SDK for simple integrations

### 3. Stripe (via EBANX)

**Profile:** Global payment platform, operating in Brazil via EBANX partnership.

| Feature | Support |
|---------|---------|
| PIX | Via EBANX (limits: R$3k/tx, US$10k/month) |
| Boleto | Sim |
| Credit Card | Competitive |
| Split Payments | Stripe Connect (industry-leading) |
| Webhooks | Best-in-class |
| Recurring | Stripe Billing |
| Node.js SDK | Oficial (`stripe` npm) |
| Monthly Fee | Nenhuma |

**Strengths:**
- Best API/developer experience globally
- Stripe Connect is the gold standard for marketplace splits
- Official TypeScript SDK
- If international expansion planned, already global

**Weaknesses:**
- PIX not native (EBANX dependency with transaction limits)
- IOF 3,5% tax on international transactions
- 2026 PIX participant equity requirement (R$5M)
- Overkill for Brazil-only B2B

### 4. Iugu

**Profile:** Brazilian startup-focused payment platform.

| Feature | Support |
|---------|---------|
| PIX | Native + Bolepix (PIX+boleto combo) |
| Boleto | Sim |
| Credit Card | Sim |
| Split Payments | Per invoice/account |
| Webhooks | Completo |
| Recurring | Excelente (core feature) |
| Node.js SDK | Community |
| Monthly Fee | Nenhuma |

**Strengths:**
- Claims lowest market fees
- Unique Bolepix feature
- Strong subscription management

**Weaknesses:**
- Smaller ecosystem
- No official Node.js SDK
- Less B2B-specific documentation

---

## Decision

### Recommended: **Asaas** (Primary) + **Mercado Pago** (Fallback)

**Rationale:**

1. **B2B alignment** - Asaas is purpose-built for B2B accounts receivable, matching our brand→supplier payment flow
2. **Transparent fees** - R$1,99 flat PIX/boleto vs. percentage-based competitors. For high-value textile orders (R$5k-50k), flat fees are significantly cheaper
3. **Split + subscription combo** - Single API call can split payments + manage recurring billing
4. **Digital accounts** - Each supplier gets an Asaas wallet, simplifying payout management
5. **Mercado Pago fallback** - Official SDK + strongest brand provides reliability if Asaas has issues

**Why not Stripe:**
- PIX limitations (not native, EBANX dependency)
- IOF tax adds 3.5% to all transactions
- Over-engineered for a Brazil-only B2B platform
- Can reconsider if international expansion becomes a priority

---

## Implementation Plan

### Phase 1: PIX Payments (MVP)

```
Brand → (PIX via Asaas) → Platform → (Split) → Supplier Wallet
                                    → Platform Fee
```

**Schema Changes:**
```sql
-- Add gateway metadata to payments table
ALTER TABLE payments ADD COLUMN "gatewayId" VARCHAR(255);
ALTER TABLE payments ADD COLUMN "gatewayProvider" VARCHAR(50) DEFAULT 'asaas';
ALTER TABLE payments ADD COLUMN "gatewayStatus" VARCHAR(50);
ALTER TABLE payments ADD COLUMN "pixQrCode" TEXT;
ALTER TABLE payments ADD COLUMN "pixCopiaECola" TEXT;
ALTER TABLE payments ADD COLUMN "boletoUrl" TEXT;
ALTER TABLE payments ADD COLUMN "boletoBarcode" VARCHAR(255);

-- Supplier gateway account
ALTER TABLE companies ADD COLUMN "gatewayAccountId" VARCHAR(255);
ALTER TABLE companies ADD COLUMN "gatewayAccountStatus" VARCHAR(50);
```

**Backend Module:**
```
backend/src/modules/payment-gateway/
  payment-gateway.module.ts
  payment-gateway.service.ts        # Orchestrator
  providers/
    asaas.provider.ts               # Asaas API client
    mercadopago.provider.ts         # Fallback provider
  webhooks/
    payment-webhook.controller.ts   # POST /webhooks/payments
  dto/
    create-charge.dto.ts
    webhook-event.dto.ts
```

**Webhook Handler Flow:**
```
Asaas webhook → POST /webhooks/payments
  → Validate signature
  → Map gateway status → internal PaymentStatus
  → Update payment record
  → Emit PAYMENT_RECEIVED event (existing handler)
  → Notify supplier via WebSocket + Email
```

### Phase 2: Boleto + Credit Card

- Add boleto generation endpoint
- Add credit card tokenization
- Implement 3D Secure for card payments

### Phase 3: Supplier Payouts

- Automatic weekly/biweekly/monthly payouts
- Integration with PayoutFrequencyPage (currently mock)
- Payout scheduling cron job
- Payout history and reconciliation

### Phase 4: Advanced Features

- Receivables advance (antecipacao) - AdvancePage
- Deposit batching - DepositsPage
- Invoice generation
- Financial reconciliation reports

---

## Fee Model

| Method | Asaas Fee | Platform Fee (proposed) | Total Brand Cost |
|--------|-----------|------------------------|-----------------|
| PIX | R$1,99 | 2.0% of order value | R$1,99 + 2.0% |
| Boleto | R$1,99 | 2.0% of order value | R$1,99 + 2.0% |
| Credit Card | 2,99% + R$0,49 | 2.0% of order value | ~5% + R$0,49 |

**Example:** R$10.000 order via PIX
- Asaas fee: R$1,99
- Platform fee: R$200,00 (2%)
- Supplier receives: R$9.798,01
- Platform revenue: R$200,00

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Asaas downtime | Mercado Pago fallback provider |
| Webhook delivery failures | Idempotent handlers + retry queue |
| Split payment disputes | Escrow period before supplier release |
| Regulatory changes (PIX) | Abstract provider interface for swap |
| Fee changes | Configuration-driven fee model |

---

## References

- [Asaas API Docs](https://docs.asaas.com)
- [Asaas Split Payment](https://docs.asaas.com/docs/payment-split-overview)
- [Mercado Pago Node.js SDK](https://github.com/mercadopago/sdk-nodejs)
- [Mercado Pago Split Payments](https://www.mercadopago.com.br/developers/en/docs/split-payments/landing)
- [BCB PIX Regulations](https://www.bcb.gov.br/estabilidadefinanceira/pix)
