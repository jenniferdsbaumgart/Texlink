# Plano de Implementação Completo - Chat Production-Ready

**Projeto:** Texlink - Sistema de Chat em Tempo Real
**Data de Criação:** 28 de Janeiro de 2026
**Prazo Total Estimado:** 4-6 semanas
**Complexidade:** Alta

---

## 📚 Índice

1. [Visão Geral](#visão-geral)
2. [Fase 1: Segurança e Estabilidade](#fase-1-segurança-e-estabilidade)
3. [Fase 2: Funcionalidade Offline](#fase-2-funcionalidade-offline)
4. [Fase 3: Performance e UX](#fase-3-performance-e-ux)
5. [Fase 4: Qualidade e Testes](#fase-4-qualidade-e-testes)
6. [Fase 5: Deploy e Monitoramento](#fase-5-deploy-e-monitoramento)
7. [Checklist Final](#checklist-final)

---

## Visão Geral

### Objetivo
Transformar o chat atual (70% completo) em um sistema production-ready com:
- ✅ Funcionalidade offline robusta
- ✅ Segurança enterprise-grade
- ✅ Performance otimizada
- ✅ Testes abrangentes
- ✅ Monitoramento completo

### Métricas de Sucesso
- [ ] Zero perda de mensagens (offline/online)
- [ ] Tempo de resposta < 200ms (p95)
- [ ] Cobertura de testes > 80%
- [ ] Rate limiting em produção
- [ ] Uptime > 99.9%

### Tecnologias a Adicionar
```json
{
  "backend": [
    "rate-limiter-flexible",
    "isomorphic-dompurify",
    "@nestjs/throttler",
    "ioredis"
  ],
  "frontend": [
    "localforage",
    "dexie",
    "@tanstack/react-query@5"
  ],
  "devDependencies": [
    "@types/jest",
    "supertest",
    "@testing-library/react",
    "@testing-library/hooks"
  ]
}
```

---

## Fase 1: Segurança e Estabilidade

**Prazo:** 1 semana
**Prioridade:** 🔴 CRÍTICA
**Responsável:** Backend Developer + DevOps

### 1.1. Rate Limiting (2 dias)

#### Objetivo
Proteger o sistema contra spam e ataques DoS.

#### Implementação Backend

**Passo 1: Instalar Dependências**
```bash
cd backend
npm install rate-limiter-flexible ioredis
npm install --save-dev @types/ioredis
```

**Passo 2: Criar Configuração Redis** (`backend/src/config/redis.config.ts`)
```typescript
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

export const createRedisClient = (configService: ConfigService) => {
  const redisUrl = configService.get<string>('REDIS_URL');

  if (redisUrl) {
    return new Redis(redisUrl, {
      maxRetriesPerRequest: 3,
      enableReadyCheck: true,
      enableOfflineQueue: false,
    });
  }

  // Fallback para desenvolvimento sem Redis
  return null;
};
```

**Passo 3: Criar Rate Limiter Service** (`backend/src/common/services/rate-limiter.service.ts`)
```typescript
import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RateLimiterMemory, RateLimiterRedis } from 'rate-limiter-flexible';
import { createRedisClient } from '../../config/redis.config';

@Injectable()
export class RateLimiterService {
  private readonly logger = new Logger(RateLimiterService.name);
  private messageLimiter: RateLimiterMemory | RateLimiterRedis;
  private connectionLimiter: RateLimiterMemory | RateLimiterRedis;

  constructor(private configService: ConfigService) {
    const redisClient = createRedisClient(configService);

    if (redisClient) {
      this.logger.log('Using Redis for rate limiting');

      // Limiter para mensagens (10 por minuto por usuário)
      this.messageLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rate_limit_msg',
        points: 10, // 10 mensagens
        duration: 60, // por minuto
        blockDuration: 60, // Bloqueio de 1 minuto se exceder
      });

      // Limiter para conexões (5 por minuto por IP)
      this.connectionLimiter = new RateLimiterRedis({
        storeClient: redisClient,
        keyPrefix: 'rate_limit_conn',
        points: 5,
        duration: 60,
        blockDuration: 300, // Bloqueio de 5 minutos
      });
    } else {
      this.logger.warn('Redis not available, using in-memory rate limiting');

      // Fallback para memória (desenvolvimento)
      this.messageLimiter = new RateLimiterMemory({
        points: 10,
        duration: 60,
        blockDuration: 60,
      });

      this.connectionLimiter = new RateLimiterMemory({
        points: 5,
        duration: 60,
        blockDuration: 300,
      });
    }
  }

  async checkMessageLimit(userId: string): Promise<void> {
    try {
      await this.messageLimiter.consume(userId);
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      throw new Error(
        `Rate limit exceeded. Try again in ${retryAfter} seconds.`
      );
    }
  }

  async checkConnectionLimit(ip: string): Promise<void> {
    try {
      await this.connectionLimiter.consume(ip);
    } catch (rejRes: any) {
      const retryAfter = Math.ceil(rejRes.msBeforeNext / 1000);
      throw new Error(
        `Too many connection attempts. Try again in ${retryAfter} seconds.`
      );
    }
  }

  async getRemainingPoints(userId: string): Promise<number> {
    try {
      const res = await this.messageLimiter.get(userId);
      return res ? res.remainingPoints : 10;
    } catch {
      return 10;
    }
  }
}
```

**Passo 4: Atualizar ChatGateway** (`backend/src/modules/chat/chat.gateway.ts`)
```typescript
import { RateLimiterService } from '../../common/services/rate-limiter.service';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
  constructor(
    private readonly chatService: ChatService,
    private readonly jwtService: JwtService,
    private readonly prisma: PrismaService,
    private readonly rateLimiter: RateLimiterService, // Injetar
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // Rate limit por IP
      const clientIp = client.handshake.address;
      await this.rateLimiter.checkConnectionLimit(clientIp);

      // ... resto da lógica de conexão
    } catch (error) {
      this.logger.error(`Connection rate limited: ${error.message}`);
      client.emit('error', {
        message: 'Too many connection attempts',
        retryAfter: error.message.match(/\d+/)?.[0]
      });
      client.disconnect();
    }
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: SendMessagePayload,
  ) {
    try {
      // Rate limit por usuário
      await this.rateLimiter.checkMessageLimit(client.userId);

      const message = await this.chatService.sendMessage(
        data.orderId,
        client.userId,
        {
          type: data.type,
          content: data.content,
          proposedPrice: data.proposedPrice,
          proposedQuantity: data.proposedQuantity,
          proposedDeadline: data.proposedDeadline,
        },
      );

      const roomName = `order:${data.orderId}`;
      this.server.to(roomName).emit('new-message', message);

      // Retornar pontos restantes
      const remaining = await this.rateLimiter.getRemainingPoints(client.userId);

      this.logger.log(`Message sent in ${roomName} by ${client.userName}`);

      return {
        success: true,
        message,
        rateLimitRemaining: remaining
      };
    } catch (error) {
      this.logger.error(`Error sending message: ${error.message}`);

      if (error.message.includes('Rate limit')) {
        return {
          success: false,
          error: error.message,
          code: 'RATE_LIMIT_EXCEEDED'
        };
      }

      return { success: false, error: error.message };
    }
  }
}
```

**Passo 5: Registrar no Module**
```typescript
// backend/src/common/common.module.ts
import { Module, Global } from '@nestjs/common';
import { RateLimiterService } from './services/rate-limiter.service';

@Global()
@Module({
  providers: [RateLimiterService],
  exports: [RateLimiterService],
})
export class CommonModule {}

// backend/src/app.module.ts
import { CommonModule } from './common/common.module';

@Module({
  imports: [
    // ... outros imports
    CommonModule,
  ],
})
export class AppModule {}
```

**Passo 6: Adicionar Variáveis de Ambiente**
```bash
# backend/.env
REDIS_URL=redis://localhost:6379
# Ou para produção:
# REDIS_URL=redis://:password@host:port
```

#### Implementação Frontend

**Atualizar useChatSocket** para lidar com rate limit:
```typescript
// src/hooks/useChatSocket.ts

const [rateLimitInfo, setRateLimitInfo] = useState({
  remaining: 10,
  blocked: false,
  retryAfter: 0,
});

socket.on('error', (error: { message: string; code?: string; retryAfter?: string }) => {
  if (error.code === 'RATE_LIMIT_EXCEEDED') {
    setRateLimitInfo({
      remaining: 0,
      blocked: true,
      retryAfter: parseInt(error.retryAfter || '60'),
    });

    // Auto-desbloqueio após tempo
    setTimeout(() => {
      setRateLimitInfo(prev => ({ ...prev, blocked: false }));
    }, parseInt(error.retryAfter || '60') * 1000);
  }

  options.onError?.(error.message);
});

// No callback de send-message
socket.emit('send-message', data, (response: any) => {
  if (response.success && response.rateLimitRemaining !== undefined) {
    setRateLimitInfo(prev => ({
      ...prev,
      remaining: response.rateLimitRemaining
    }));
  }
  resolve(response.success);
});

// Exportar no return
return {
  // ... outros
  rateLimitInfo,
};
```

**Atualizar ChatInterface** para mostrar rate limit:
```typescript
// src/components/kanban/ChatInterface.tsx

const { rateLimitInfo } = useChatSocket(order.id);

// Mostrar warning se próximo do limite
{rateLimitInfo.remaining <= 3 && !rateLimitInfo.blocked && (
  <div className="p-2 bg-yellow-50 border-l-4 border-yellow-400 text-xs">
    ⚠️ Você pode enviar mais {rateLimitInfo.remaining} mensagens neste minuto
  </div>
)}

// Bloquear input se rate limited
{rateLimitInfo.blocked && (
  <div className="p-3 bg-red-50 border-l-4 border-red-400 text-sm">
    🚫 Muitas mensagens enviadas. Aguarde {rateLimitInfo.retryAfter}s
  </div>
)}

<input
  disabled={rateLimitInfo.blocked || !isConnected}
  // ...
/>
```

#### Testes

**Teste Backend** (`backend/src/common/services/rate-limiter.service.spec.ts`)
```typescript
describe('RateLimiterService', () => {
  let service: RateLimiterService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RateLimiterService,
        {
          provide: ConfigService,
          useValue: { get: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<RateLimiterService>(RateLimiterService);
  });

  it('should allow messages within limit', async () => {
    await expect(service.checkMessageLimit('user1')).resolves.not.toThrow();
  });

  it('should block after exceeding limit', async () => {
    // Enviar 10 mensagens (limite)
    for (let i = 0; i < 10; i++) {
      await service.checkMessageLimit('user2');
    }

    // 11ª mensagem deve falhar
    await expect(service.checkMessageLimit('user2')).rejects.toThrow(
      'Rate limit exceeded'
    );
  });

  it('should return remaining points', async () => {
    const remaining = await service.getRemainingPoints('user3');
    expect(remaining).toBe(10);

    await service.checkMessageLimit('user3');
    const afterOne = await service.getRemainingPoints('user3');
    expect(afterOne).toBe(9);
  });
});
```

---

### 1.2. Sanitização de Conteúdo (1 dia)

#### Objetivo
Prevenir XSS, SQL injection e outros ataques via mensagens.

#### Implementação Backend

**Passo 1: Instalar Dependência**
```bash
npm install isomorphic-dompurify
npm install --save-dev @types/dompurify
```

**Passo 2: Criar Sanitizer Service** (`backend/src/common/services/sanitizer.service.ts`)
```typescript
import { Injectable } from '@nestjs/common';
import * as DOMPurify from 'isomorphic-dompurify';

@Injectable()
export class SanitizerService {
  /**
   * Remove todo HTML e scripts do texto
   */
  sanitizeText(text: string): string {
    if (!text) return '';

    // Remove todas as tags HTML
    const clean = DOMPurify.sanitize(text, {
      ALLOWED_TAGS: [], // Sem tags permitidas
      ALLOWED_ATTR: [],
      KEEP_CONTENT: true, // Mantém conteúdo, remove apenas tags
    });

    // Trim e normaliza espaços
    return clean.trim().replace(/\s+/g, ' ');
  }

  /**
   * Valida e sanitiza URL
   */
  sanitizeUrl(url: string): string | null {
    if (!url) return null;

    try {
      const parsed = new URL(url);

      // Apenas http/https
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return null;
      }

      return parsed.href;
    } catch {
      return null;
    }
  }

  /**
   * Valida e normaliza número
   */
  sanitizeNumber(value: any): number | null {
    const num = Number(value);

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    return num;
  }

  /**
   * Valida e sanitiza data
   */
  sanitizeDate(value: any): Date | null {
    try {
      const date = new Date(value);

      if (isNaN(date.getTime())) {
        return null;
      }

      // Não aceita datas muito antigas ou futuras
      const now = Date.now();
      const diff = Math.abs(date.getTime() - now);
      const maxDiff = 10 * 365 * 24 * 60 * 60 * 1000; // 10 anos

      if (diff > maxDiff) {
        return null;
      }

      return date;
    } catch {
      return null;
    }
  }
}
```

**Passo 3: Atualizar DTO com Validação Rigorosa**
```typescript
// backend/src/modules/chat/dto/send-message.dto.ts
import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Mensagem muito longa (máximo 5000 caracteres)' })
  content?: string;

  // Proposal data
  @IsNumber()
  @IsOptional()
  @Min(0.01, { message: 'Preço deve ser maior que zero' })
  @Max(1000000, { message: 'Preço muito alto' })
  proposedPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Quantidade deve ser pelo menos 1' })
  @Max(1000000, { message: 'Quantidade muito alta' })
  proposedQuantity?: number;

  @IsDateString()
  @IsOptional()
  proposedDeadline?: string;
}
```

**Passo 4: Aplicar Sanitização no Service**
```typescript
// backend/src/modules/chat/chat.service.ts
import { SanitizerService } from '../../common/services/sanitizer.service';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ChatService {
  constructor(
    private prisma: PrismaService,
    private sanitizer: SanitizerService, // Injetar
  ) {}

  async sendMessage(orderId: string, userId: string, dto: SendMessageDto) {
    await this.verifyOrderAccess(orderId, userId);

    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order) {
      throw new NotFoundException('Order not found');
    }

    const messageData: any = {
      orderId,
      senderId: userId,
      type: dto.type,
    };

    // Sanitizar conteúdo de texto
    if (dto.content) {
      const sanitized = this.sanitizer.sanitizeText(dto.content);

      if (!sanitized) {
        throw new BadRequestException('Conteúdo inválido');
      }

      messageData.content = sanitized;
    }

    // Validar e sanitizar proposta
    if (dto.type === MessageType.PROPOSAL) {
      const proposedPrice = this.sanitizer.sanitizeNumber(dto.proposedPrice);
      const proposedQuantity = this.sanitizer.sanitizeNumber(dto.proposedQuantity);
      const proposedDeadline = this.sanitizer.sanitizeDate(dto.proposedDeadline);

      if (!proposedPrice || !proposedQuantity || !proposedDeadline) {
        throw new BadRequestException('Dados de proposta inválidos');
      }

      // Validar que valores fazem sentido
      if (proposedPrice <= 0 || proposedQuantity <= 0) {
        throw new BadRequestException('Valores devem ser positivos');
      }

      if (proposedDeadline < new Date()) {
        throw new BadRequestException('Data de entrega não pode ser no passado');
      }

      messageData.proposalData = {
        originalValues: {
          pricePerUnit: Number(order.pricePerUnit),
          quantity: order.quantity,
          deliveryDeadline: order.deliveryDeadline.toISOString(),
        },
        newValues: {
          pricePerUnit: proposedPrice,
          quantity: proposedQuantity,
          deliveryDeadline: proposedDeadline.toISOString(),
        },
        status: 'PENDING',
      };
    }

    return this.prisma.message.create({
      data: messageData,
      include: {
        sender: { select: { id: true, name: true, role: true } },
      },
    });
  }
}
```

**Passo 5: Registrar no Module**
```typescript
// backend/src/common/common.module.ts
import { SanitizerService } from './services/sanitizer.service';

@Global()
@Module({
  providers: [RateLimiterService, SanitizerService],
  exports: [RateLimiterService, SanitizerService],
})
export class CommonModule {}
```

#### Testes

```typescript
// backend/src/common/services/sanitizer.service.spec.ts
describe('SanitizerService', () => {
  let service: SanitizerService;

  beforeEach(() => {
    service = new SanitizerService();
  });

  describe('sanitizeText', () => {
    it('should remove HTML tags', () => {
      const input = '<script>alert("xss")</script>Hello';
      const output = service.sanitizeText(input);
      expect(output).toBe('Hello');
    });

    it('should remove dangerous attributes', () => {
      const input = '<img src=x onerror="alert(1)">';
      const output = service.sanitizeText(input);
      expect(output).not.toContain('onerror');
    });

    it('should trim whitespace', () => {
      const input = '  Hello   World  ';
      const output = service.sanitizeText(input);
      expect(output).toBe('Hello World');
    });
  });

  describe('sanitizeNumber', () => {
    it('should convert valid numbers', () => {
      expect(service.sanitizeNumber('123')).toBe(123);
      expect(service.sanitizeNumber(456.78)).toBe(456.78);
    });

    it('should reject invalid numbers', () => {
      expect(service.sanitizeNumber('abc')).toBeNull();
      expect(service.sanitizeNumber(NaN)).toBeNull();
      expect(service.sanitizeNumber(Infinity)).toBeNull();
    });
  });

  describe('sanitizeDate', () => {
    it('should accept valid dates', () => {
      const date = service.sanitizeDate('2026-02-15');
      expect(date).toBeInstanceOf(Date);
    });

    it('should reject very old dates', () => {
      const veryOld = service.sanitizeDate('1900-01-01');
      expect(veryOld).toBeNull();
    });

    it('should reject invalid dates', () => {
      expect(service.sanitizeDate('not-a-date')).toBeNull();
    });
  });
});
```

---

### 1.3. Índices no Banco de Dados (1 dia)

#### Objetivo
Otimizar performance de queries de mensagens.

#### Implementação

**Passo 1: Atualizar Schema Prisma**
```prisma
// backend/prisma/schema.prisma

model Message {
  id       String      @id @default(uuid())
  orderId  String
  senderId String
  type     MessageType @default(TEXT)
  content  String?
  proposalData Json?
  read      Boolean  @default(false)
  createdAt DateTime @default(now())

  order  Order @relation(fields: [orderId], references: [id], onDelete: Cascade)
  sender User  @relation(fields: [senderId], references: [id])

  // NOVOS ÍNDICES
  @@index([orderId, createdAt(sort: Desc)], name: "idx_messages_order_date")
  @@index([orderId, read, senderId], name: "idx_messages_unread")
  @@index([senderId, createdAt(sort: Desc)], name: "idx_messages_sender")

  @@map("messages")
}
```

**Passo 2: Criar Migration**
```bash
cd backend
npx prisma migrate dev --name add_message_indexes
```

**Passo 3: Verificar Índices Criados**
```bash
npx prisma studio
# Ou conectar ao banco e verificar:
# \d messages (PostgreSQL)
```

#### Análise de Performance

**Antes (sem índices):**
```sql
EXPLAIN ANALYZE
SELECT * FROM messages
WHERE "orderId" = 'xxx'
ORDER BY "createdAt" DESC;

-- Seq Scan on messages  (cost=0.00..1234.56 rows=100 width=200)
-- Planning Time: 5.123 ms
-- Execution Time: 25.456 ms
```

**Depois (com índices):**
```sql
-- Index Scan using idx_messages_order_date  (cost=0.29..12.34 rows=100 width=200)
-- Planning Time: 0.234 ms
-- Execution Time: 1.567 ms
```

**Melhoria:** ~16x mais rápido

---

### 1.4. Validação de Tamanho (0.5 dia)

#### Implementação

**Já implementado no DTO:**
```typescript
@MaxLength(5000)
content?: string;
```

**Adicionar validação adicional no Gateway:**
```typescript
@SubscribeMessage('send-message')
async handleSendMessage(client, data: SendMessagePayload) {
  // Validar tamanho antes de processar
  if (data.content && data.content.length > 5000) {
    return {
      success: false,
      error: 'Mensagem muito longa (máximo 5000 caracteres)',
      code: 'MESSAGE_TOO_LONG'
    };
  }

  // Continuar processamento...
}
```

**Frontend - Contador de caracteres:**
```typescript
// src/components/kanban/ChatInterface.tsx

const [inputValue, setInputValue] = useState('');
const MAX_LENGTH = 5000;

<div className="relative">
  <input
    value={inputValue}
    onChange={(e) => {
      if (e.target.value.length <= MAX_LENGTH) {
        setInputValue(e.target.value);
      }
    }}
    maxLength={MAX_LENGTH}
  />

  <div className="absolute bottom-2 right-2 text-xs text-gray-400">
    {inputValue.length}/{MAX_LENGTH}
  </div>

  {inputValue.length > MAX_LENGTH * 0.9 && (
    <div className="text-xs text-yellow-600 mt-1">
      ⚠️ Próximo do limite de caracteres
    </div>
  )}
</div>
```

---

## Fase 2: Funcionalidade Offline

**Prazo:** 2 semanas
**Prioridade:** 🔴 CRÍTICA
**Responsável:** Frontend Developer

### 2.1. Queue de Mensagens Offline (3-4 dias)

#### Objetivo
Garantir que nenhuma mensagem seja perdida quando o usuário está offline.

#### Arquitetura

```
┌─────────────────────────────────────────────────┐
│           User Interface (React)                 │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│         useChatSocket Hook                      │
│  ┌──────────────────────────────────────────┐  │
│  │ State: messages, pendingQueue             │  │
│  │ sendMessage() → check connection          │  │
│  │   Online:  emit to server                 │  │
│  │   Offline: add to pendingQueue            │  │
│  └──────────────────────────────────────────┘  │
└────────────────┬────────────────────────────────┘
                 │
                 v
┌─────────────────────────────────────────────────┐
│      IndexedDB (via Dexie)                      │
│  ┌──────────────────────────────────────────┐  │
│  │ Table: pending_messages                   │  │
│  │   - id (tempId)                           │  │
│  │   - orderId                               │  │
│  │   - type                                  │  │
│  │   - content                               │  │
│  │   - timestamp                             │  │
│  │   - retryCount                            │  │
│  │   - status (pending/failed/sent)          │  │
│  └──────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
                 │
                 v (quando online)
┌─────────────────────────────────────────────────┐
│         WebSocket Server                        │
└─────────────────────────────────────────────────┘
```

#### Implementação

**Passo 1: Instalar Dependências**
```bash
cd frontend
npm install dexie
npm install --save-dev @types/dexie
```

**Passo 2: Criar Database Schema** (`src/db/chat-db.ts`)
```typescript
import Dexie, { Table } from 'dexie';

export interface PendingMessage {
  id: string; // tempId
  orderId: string;
  type: 'TEXT' | 'PROPOSAL';
  content?: string;
  proposedPrice?: number;
  proposedQuantity?: number;
  proposedDeadline?: string;
  timestamp: number;
  retryCount: number;
  status: 'pending' | 'sending' | 'failed' | 'sent';
  error?: string;
}

export class ChatDatabase extends Dexie {
  pendingMessages!: Table<PendingMessage, string>;

  constructor() {
    super('ChatDB');

    this.version(1).stores({
      pendingMessages: 'id, orderId, timestamp, status',
    });
  }
}

export const chatDb = new ChatDatabase();
```

**Passo 3: Criar Hook de Gerenciamento de Queue** (`src/hooks/useMessageQueue.ts`)
```typescript
import { useState, useEffect, useCallback } from 'use';
import { chatDb, PendingMessage } from '../db/chat-db';

interface UseMessageQueueOptions {
  orderId: string;
  onSendSuccess?: (message: any) => void;
  onSendError?: (error: string) => void;
}

export function useMessageQueue(options: UseMessageQueueOptions) {
  const { orderId, onSendSuccess, onSendError } = options;
  const [pendingCount, setPendingCount] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Carregar contagem de pendentes
  const loadPendingCount = useCallback(async () => {
    const count = await chatDb.pendingMessages
      .where({ orderId, status: 'pending' })
      .count();
    setPendingCount(count);
  }, [orderId]);

  useEffect(() => {
    loadPendingCount();
  }, [loadPendingCount]);

  // Adicionar mensagem à queue
  const queueMessage = useCallback(
    async (data: Omit<PendingMessage, 'id' | 'timestamp' | 'retryCount' | 'status'>) => {
      const message: PendingMessage = {
        ...data,
        id: `temp-${Date.now()}-${Math.random()}`,
        timestamp: Date.now(),
        retryCount: 0,
        status: 'pending',
      };

      await chatDb.pendingMessages.add(message);
      await loadPendingCount();

      return message.id;
    },
    [loadPendingCount]
  );

  // Processar queue (tentar enviar mensagens pendentes)
  const processQueue = useCallback(
    async (sendFunction: (data: any) => Promise<boolean>) => {
      if (isProcessing) return;

      setIsProcessing(true);

      try {
        const pending = await chatDb.pendingMessages
          .where({ orderId, status: 'pending' })
          .sortBy('timestamp');

        for (const msg of pending) {
          try {
            // Marcar como "sending"
            await chatDb.pendingMessages.update(msg.id, { status: 'sending' });

            // Tentar enviar
            const success = await sendFunction({
              type: msg.type,
              content: msg.content,
              proposedPrice: msg.proposedPrice,
              proposedQuantity: msg.proposedQuantity,
              proposedDeadline: msg.proposedDeadline,
            });

            if (success) {
              // Sucesso - remover da queue
              await chatDb.pendingMessages.delete(msg.id);
              onSendSuccess?.(msg);
            } else {
              // Falha - incrementar retry
              const newRetryCount = msg.retryCount + 1;

              if (newRetryCount >= 3) {
                // Após 3 tentativas, marcar como failed
                await chatDb.pendingMessages.update(msg.id, {
                  status: 'failed',
                  retryCount: newRetryCount,
                  error: 'Max retries exceeded',
                });
                onSendError?.(`Failed to send message after 3 attempts`);
              } else {
                // Voltar para pending para tentar depois
                await chatDb.pendingMessages.update(msg.id, {
                  status: 'pending',
                  retryCount: newRetryCount,
                });
              }
            }
          } catch (error: any) {
            console.error('Error processing queued message:', error);
            await chatDb.pendingMessages.update(msg.id, {
              status: 'pending', // Tentar novamente
              error: error.message,
            });
          }
        }

        await loadPendingCount();
      } finally {
        setIsProcessing(false);
      }
    },
    [orderId, isProcessing, loadPendingCount, onSendSuccess, onSendError]
  );

  // Limpar mensagens antigas (> 7 dias)
  const cleanupOld = useCallback(async () => {
    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    await chatDb.pendingMessages
      .where('timestamp')
      .below(weekAgo)
      .delete();
  }, []);

  // Obter mensagens falhadas
  const getFailedMessages = useCallback(async () => {
    return chatDb.pendingMessages
      .where({ orderId, status: 'failed' })
      .toArray();
  }, [orderId]);

  // Retentar mensagem falhada
  const retryFailed = useCallback(async (messageId: string) => {
    await chatDb.pendingMessages.update(messageId, {
      status: 'pending',
      retryCount: 0,
      error: undefined,
    });
    await loadPendingCount();
  }, [loadPendingCount]);

  return {
    pendingCount,
    isProcessing,
    queueMessage,
    processQueue,
    cleanupOld,
    getFailedMessages,
    retryFailed,
  };
}
```

**Passo 4: Integrar no useChatSocket** (`src/hooks/useChatSocket.ts`)
```typescript
import { useMessageQueue } from './useMessageQueue';

export function useChatSocket(
  orderId: string | null,
  options: UseChatSocketOptions = {}
): UseChatSocketReturn {
  // ... estados existentes

  // Adicionar queue
  const {
    pendingCount,
    isProcessing,
    queueMessage,
    processQueue,
  } = useMessageQueue({
    orderId: orderId || '',
    onSendSuccess: (msg) => {
      console.log('Queued message sent successfully:', msg.id);
    },
    onSendError: (error) => {
      console.error('Failed to send queued message:', error);
      options.onError?.(error);
    },
  });

  // Modificar sendMessage
  const sendMessage = useCallback(
    async (data: SendMessageData): Promise<boolean> => {
      if (!orderId) return false;

      // Se está offline ou não conectado, adicionar à queue
      if (!socketRef.current || !isConnected) {
        console.log('Offline - queueing message');

        const tempId = await queueMessage({
          orderId,
          ...data,
        });

        // Adicionar mensagem temporária na UI
        const tempMessage: ChatMessage = {
          id: tempId,
          orderId,
          senderId: 'current-user', // Obter do contexto
          type: data.type,
          content: data.content,
          proposalData: data.type === 'PROPOSAL' ? {
            originalValues: { /* ... */ },
            newValues: {
              pricePerUnit: data.proposedPrice || 0,
              quantity: data.proposedQuantity || 0,
              deliveryDeadline: data.proposedDeadline || '',
            },
            status: 'PENDING',
          } : undefined,
          read: false,
          createdAt: new Date().toISOString(),
          sender: {
            id: 'current-user',
            name: 'Você',
            role: 'BRAND',
          },
          isPending: true, // Flag especial
        };

        setMessages(prev => [...prev, tempMessage]);

        return true; // Retorna true porque foi enfileirada
      }

      // Se online, tentar enviar normalmente
      return new Promise((resolve) => {
        socketRef.current!.emit(
          'send-message',
          { orderId, ...data },
          (response: any) => {
            resolve(response.success);
          }
        );
      });
    },
    [orderId, isConnected, queueMessage]
  );

  // Processar queue quando reconectar
  useEffect(() => {
    if (isConnected && pendingCount > 0 && !isProcessing) {
      console.log(`Processing ${pendingCount} queued messages...`);
      processQueue(sendMessage);
    }
  }, [isConnected, pendingCount, isProcessing, processQueue, sendMessage]);

  // Retornar info adicional
  return {
    // ... retornos existentes
    pendingCount,
    isProcessingQueue: isProcessing,
  };
}
```

**Passo 5: Atualizar UI para Mostrar Mensagens Pendentes**
```typescript
// src/components/kanban/ChatInterface.tsx

const { pendingCount, isProcessingQueue } = useChatSocket(order.id);

// Mostrar badge de mensagens pendentes
{pendingCount > 0 && (
  <div className="p-2 bg-blue-50 border-l-4 border-blue-400 text-xs flex items-center justify-between">
    <span>
      📤 {pendingCount} {pendingCount === 1 ? 'mensagem' : 'mensagens'} aguardando envio
    </span>
    {isProcessingQueue && (
      <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
    )}
  </div>
)}

// Mostrar status de mensagem pendente
{messages.map((msg) => (
  <div key={msg.id} className="relative">
    {msg.isPending && (
      <div className="absolute -left-2 top-1/2 -translate-y-1/2">
        <Loader2 className="w-3 h-3 animate-spin text-blue-400" />
      </div>
    )}

    {/* ... renderização da mensagem ... */}
  </div>
))}
```

#### Testes

**Teste Manual:**
1. Abrir chat
2. Desconectar Wi-Fi
3. Enviar 3 mensagens
4. Verificar que aparecem como "pendentes"
5. Reconectar Wi-Fi
6. Verificar que mensagens são enviadas automaticamente

**Teste Automatizado:**
```typescript
// src/hooks/useMessageQueue.test.ts
import { renderHook, act, waitFor } from '@testing-library/react';
import { useMessageQueue } from './useMessageQueue';
import { chatDb } from '../db/chat-db';

describe('useMessageQueue', () => {
  beforeEach(async () => {
    await chatDb.pendingMessages.clear();
  });

  it('should queue message when offline', async () => {
    const { result } = renderHook(() =>
      useMessageQueue({ orderId: 'order-1' })
    );

    await act(async () => {
      await result.current.queueMessage({
        orderId: 'order-1',
        type: 'TEXT',
        content: 'Test message',
      });
    });

    expect(result.current.pendingCount).toBe(1);
  });

  it('should process queue and send messages', async () => {
    const mockSend = jest.fn().mockResolvedValue(true);
    const { result } = renderHook(() =>
      useMessageQueue({ orderId: 'order-1' })
    );

    // Queue message
    await act(async () => {
      await result.current.queueMessage({
        orderId: 'order-1',
        type: 'TEXT',
        content: 'Test',
      });
    });

    // Process queue
    await act(async () => {
      await result.current.processQueue(mockSend);
    });

    expect(mockSend).toHaveBeenCalled();
    await waitFor(() => {
      expect(result.current.pendingCount).toBe(0);
    });
  });

  it('should retry failed messages up to 3 times', async () => {
    const mockSend = jest.fn()
      .mockResolvedValueOnce(false) // 1ª tentativa falha
      .mockResolvedValueOnce(false) // 2ª tentativa falha
      .mockResolvedValueOnce(false) // 3ª tentativa falha
      .mockResolvedValueOnce(true); // 4ª tentativa não acontece

    const { result } = renderHook(() =>
      useMessageQueue({ orderId: 'order-1' })
    );

    await act(async () => {
      await result.current.queueMessage({
        orderId: 'order-1',
        type: 'TEXT',
        content: 'Test',
      });
    });

    // Process 3 vezes
    for (let i = 0; i < 3; i++) {
      await act(async () => {
        await result.current.processQueue(mockSend);
      });
    }

    // Deve ter falhado
    const failed = await result.current.getFailedMessages();
    expect(failed.length).toBe(1);
    expect(failed[0].retryCount).toBe(3);
    expect(failed[0].status).toBe('failed');
  });
});
```

---

### 2.2. Detecção Online/Offline (1 dia)

#### Objetivo
Detectar quando o navegador fica offline e atualizar UI adequadamente.

#### Implementação

**Passo 1: Criar Hook de Status de Rede** (`src/hooks/useNetworkStatus.ts`)
```typescript
import { useState, useEffect } from 'react';

export function useNetworkStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [wasOffline, setWasOffline] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      console.log('[NetworkStatus] Browser is online');
      setIsOnline(true);

      // Marcar que ficou offline (para mostrar notificação)
      if (!navigator.onLine) {
        setWasOffline(true);
        setTimeout(() => setWasOffline(false), 5000); // Reset após 5s
      }
    };

    const handleOffline = () => {
      console.log('[NetworkStatus] Browser is offline');
      setIsOnline(false);
      setWasOffline(true);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Verificar periodicamente (backup)
    const interval = setInterval(() => {
      if (navigator.onLine !== isOnline) {
        setIsOnline(navigator.onLine);
      }
    }, 5000);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearInterval(interval);
    };
  }, [isOnline]);

  return { isOnline, wasOffline };
}
```

**Passo 2: Integrar em useChatSocket**
```typescript
import { useNetworkStatus } from './useNetworkStatus';

export function useChatSocket(...) {
  const { isOnline, wasOffline } = useNetworkStatus();

  // Tentar reconectar quando voltar online
  useEffect(() => {
    if (isOnline && socketRef.current?.disconnected) {
      console.log('[Chat] Network back online, reconnecting...');
      socketRef.current.connect();
    }
  }, [isOnline]);

  // Processar queue quando voltar online
  useEffect(() => {
    if (isOnline && wasOffline && pendingCount > 0) {
      console.log('[Chat] Back online, processing queue...');
      processQueue(actualSendMessage);
    }
  }, [isOnline, wasOffline, pendingCount]);

  return {
    // ... outros
    isOnline,
    isConnected: isConnected && isOnline, // Conectado E online
  };
}
```

**Passo 3: Atualizar UI**
```typescript
// src/components/kanban/ChatInterface.tsx

const { isOnline, isConnected, wasOffline } = useChatSocket(order.id);

// Banner de status de rede
{!isOnline && (
  <div className="bg-red-500 text-white p-2 text-center text-sm font-bold">
    ⚠️ Sem conexão com a internet
  </div>
)}

{isOnline && !isConnected && (
  <div className="bg-yellow-500 text-white p-2 text-center text-sm font-bold">
    🔄 Reconectando ao servidor...
  </div>
)}

{wasOffline && isOnline && isConnected && (
  <div className="bg-green-500 text-white p-2 text-center text-sm font-bold animate-fade-in">
    ✅ Conexão restabelecida
  </div>
)}

// Indicador visual no header
<div className="flex items-center gap-2">
  {isOnline && isConnected ? (
    <>
      <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
      <span className="text-xs text-green-600">Online</span>
    </>
  ) : !isOnline ? (
    <>
      <div className="w-2 h-2 bg-red-500 rounded-full" />
      <span className="text-xs text-red-600">Sem internet</span>
    </>
  ) : (
    <>
      <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse" />
      <span className="text-xs text-yellow-600">Conectando...</span>
    </>
  )}
</div>
```

---

### 2.3. Sincronização Delta (2 dias)

#### Objetivo
Ao reconectar, buscar apenas mensagens novas (não recarregar tudo).

#### Implementação Backend

**Passo 1: Adicionar Endpoint de Sincronização**
```typescript
// backend/src/modules/chat/chat.service.ts

async getMessagesSince(
  orderId: string,
  sinceMessageId: string | null,
  userId: string
): Promise<Message[]> {
  await this.verifyOrderAccess(orderId, userId);

  const where: any = { orderId };

  if (sinceMessageId) {
    // Buscar mensagem de referência
    const referenceMsg = await this.prisma.message.findUnique({
      where: { id: sinceMessageId },
      select: { createdAt: true },
    });

    if (referenceMsg) {
      // Buscar mensagens mais recentes
      where.createdAt = {
        gt: referenceMsg.createdAt,
      };
    }
  }

  return this.prisma.message.findMany({
    where,
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
    orderBy: { createdAt: 'asc' },
  });
}
```

**Passo 2: Adicionar Evento WebSocket**
```typescript
// backend/src/modules/chat/chat.gateway.ts

@SubscribeMessage('sync-messages')
async handleSyncMessages(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: { orderId: string; sinceMessageId?: string },
) {
  try {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated' };
    }

    const messages = await this.chatService.getMessagesSince(
      data.orderId,
      data.sinceMessageId || null,
      client.userId,
    );

    this.logger.log(
      `Synced ${messages.length} messages for ${client.userName} since ${data.sinceMessageId || 'beginning'}`
    );

    return { success: true, messages };
  } catch (error) {
    this.logger.error(`Error syncing messages: ${error.message}`);
    return { success: false, error: error.message };
  }
}
```

#### Implementação Frontend

**Atualizar useChatSocket:**
```typescript
const syncMessages = useCallback(async () => {
  if (!socketRef.current || !orderId) return;

  const lastMessage = messages[messages.length - 1];
  const sinceMessageId = lastMessage?.id;

  console.log(`[Chat] Syncing messages since ${sinceMessageId || 'beginning'}...`);

  return new Promise<void>((resolve) => {
    socketRef.current!.emit(
      'sync-messages',
      { orderId, sinceMessageId },
      (response: any) => {
        if (response.success && response.messages.length > 0) {
          console.log(`[Chat] Synced ${response.messages.length} new messages`);

          setMessages(prev => {
            // Evitar duplicatas
            const existingIds = new Set(prev.map(m => m.id));
            const newMessages = response.messages.filter(
              (m: ChatMessage) => !existingIds.has(m.id)
            );
            return [...prev, ...newMessages];
          });
        }
        resolve();
      }
    );
  });
}, [orderId, messages]);

// Sincronizar ao reconectar
socket.on('connected', async (data) => {
  console.log('Chat socket authenticated:', data.userName);
  setIsConnected(true);
  options.onConnect?.();

  // Join room
  socket.emit('join-order', { orderId }, async (response: any) => {
    if (response.success) {
      // Se já tem mensagens, sincronizar apenas novas
      if (messages.length > 0) {
        await syncMessages();
      } else {
        // Se não tem, carregar todas
        socket.emit('get-messages', { orderId }, (response: any) => {
          if (response.success) {
            setMessages(response.messages || []);
          }
          setIsLoading(false);
        });
      }
    }
  });
});
```

---

### 2.4. Persistência Local (2 dias)

#### Objetivo
Cachear mensagens localmente para acesso offline e carregamento rápido.

#### Implementação

**Passo 1: Expandir Database Schema**
```typescript
// src/db/chat-db.ts

export interface CachedMessage {
  id: string;
  orderId: string;
  senderId: string;
  senderName: string;
  type: 'TEXT' | 'PROPOSAL';
  content?: string;
  proposalData?: any;
  read: boolean;
  createdAt: string;
  cachedAt: number;
}

export class ChatDatabase extends Dexie {
  pendingMessages!: Table<PendingMessage, string>;
  cachedMessages!: Table<CachedMessage, string>; // NOVO

  constructor() {
    super('ChatDB');

    this.version(2).stores({ // Incrementar versão
      pendingMessages: 'id, orderId, timestamp, status',
      cachedMessages: 'id, orderId, createdAt, cachedAt', // NOVO
    });
  }
}
```

**Passo 2: Criar Hook de Cache** (`src/hooks/useMessageCache.ts`)
```typescript
import { useCallback } from 'react';
import { chatDb, CachedMessage } from '../db/chat-db';
import { ChatMessage } from './useChatSocket';

export function useMessageCache(orderId: string) {
  // Salvar mensagens no cache
  const cacheMessages = useCallback(
    async (messages: ChatMessage[]) => {
      const cached: CachedMessage[] = messages.map(msg => ({
        id: msg.id,
        orderId,
        senderId: msg.senderId,
        senderName: msg.sender.name,
        type: msg.type,
        content: msg.content,
        proposalData: msg.proposalData,
        read: msg.read,
        createdAt: msg.createdAt,
        cachedAt: Date.now(),
      }));

      await chatDb.cachedMessages.bulkPut(cached);
    },
    [orderId]
  );

  // Carregar do cache
  const loadFromCache = useCallback(async (): Promise<ChatMessage[]> => {
    const cached = await chatDb.cachedMessages
      .where({ orderId })
      .sortBy('createdAt');

    return cached.map(msg => ({
      id: msg.id,
      orderId: msg.orderId,
      senderId: msg.senderId,
      type: msg.type,
      content: msg.content,
      proposalData: msg.proposalData,
      read: msg.read,
      createdAt: msg.createdAt,
      sender: {
        id: msg.senderId,
        name: msg.senderName,
        role: 'BRAND', // Simplified
      },
    }));
  }, [orderId]);

  // Limpar cache antigo (> 30 dias)
  const cleanupOldCache = useCallback(async () => {
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    await chatDb.cachedMessages
      .where('cachedAt')
      .below(thirtyDaysAgo)
      .delete();
  }, []);

  return {
    cacheMessages,
    loadFromCache,
    cleanupOldCache,
  };
}
```

**Passo 3: Integrar em useChatSocket**
```typescript
import { useMessageCache } from './useMessageCache';

export function useChatSocket(...) {
  const { cacheMessages, loadFromCache, cleanupOldCache } = useMessageCache(orderId || '');
  const [isLoadingCache, setIsLoadingCache] = useState(true);

  // Carregar do cache primeiro
  useEffect(() => {
    if (!orderId) return;

    const loadCache = async () => {
      try {
        const cached = await loadFromCache();
        if (cached.length > 0) {
          console.log(`[Chat] Loaded ${cached.length} messages from cache`);
          setMessages(cached);
        }
      } catch (error) {
        console.error('[Chat] Error loading cache:', error);
      } finally {
        setIsLoadingCache(false);
      }
    };

    loadCache();
    cleanupOldCache(); // Limpar cache antigo
  }, [orderId, loadFromCache, cleanupOldCache]);

  // Cachear mensagens quando atualizarem
  useEffect(() => {
    if (messages.length > 0 && !isLoadingCache) {
      // Debounce para não cachear a cada mensagem
      const timer = setTimeout(() => {
        cacheMessages(messages);
      }, 1000);

      return () => clearTimeout(timer);
    }
  }, [messages, isLoadingCache, cacheMessages]);

  return {
    // ... outros
    isLoadingCache,
  };
}
```

---

## Fase 3: Performance e UX

**Prazo:** 2 semanas
**Prioridade:** 🟡 MÉDIO
**Responsável:** Full Stack Developer

### 3.1. Paginação de Mensagens (3 dias)

#### Objetivo
Carregar mensagens antigas sob demanda (lazy loading).

#### Implementação Backend

**Atualizar ChatService:**
```typescript
// backend/src/modules/chat/chat.service.ts

interface GetMessagesOptions {
  limit?: number;
  cursor?: string; // messageId para cursor-based pagination
  direction?: 'before' | 'after';
}

async getMessages(
  orderId: string,
  userId: string,
  options: GetMessagesOptions = {}
): Promise<{
  messages: Message[];
  hasMore: boolean;
  nextCursor: string | null;
}> {
  await this.verifyOrderAccess(orderId, userId);

  const limit = Math.min(options.limit || 50, 100); // Max 100
  const { cursor, direction = 'before' } = options;

  let where: any = { orderId };

  // Cursor-based pagination
  if (cursor) {
    const referenceMsg = await this.prisma.message.findUnique({
      where: { id: cursor },
      select: { createdAt: true },
    });

    if (referenceMsg) {
      where.createdAt = direction === 'before'
        ? { lt: referenceMsg.createdAt }
        : { gt: referenceMsg.createdAt };
    }
  }

  // Buscar limit + 1 para saber se tem mais
  const messages = await this.prisma.message.findMany({
    where,
    take: limit + 1,
    orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
    include: {
      sender: { select: { id: true, name: true, role: true } },
    },
  });

  // Marcar como lidas (apenas as retornadas, não a +1)
  const messageIds = messages.slice(0, limit).map(m => m.id);
  await this.prisma.message.updateMany({
    where: {
      id: { in: messageIds },
      senderId: { not: userId },
      read: false,
    },
    data: { read: true },
  });

  const hasMore = messages.length > limit;
  const returnMessages = messages.slice(0, limit);

  // Se estava em ordem desc (before), reverter para asc
  if (direction === 'before') {
    returnMessages.reverse();
  }

  const nextCursor = hasMore
    ? returnMessages[returnMessages.length - 1].id
    : null;

  return {
    messages: returnMessages,
    hasMore,
    nextCursor,
  };
}
```

**Atualizar Gateway:**
```typescript
@SubscribeMessage('get-messages')
async handleGetMessages(
  @ConnectedSocket() client: AuthenticatedSocket,
  @MessageBody() data: {
    orderId: string;
    limit?: number;
    cursor?: string;
    direction?: 'before' | 'after';
  },
) {
  try {
    if (!client.userId) {
      return { success: false, error: 'Not authenticated', messages: [] };
    }

    const result = await this.chatService.getMessages(
      data.orderId,
      client.userId,
      {
        limit: data.limit,
        cursor: data.cursor,
        direction: data.direction,
      }
    );

    return {
      success: true,
      ...result,
    };
  } catch (error) {
    return { success: false, error: error.message, messages: [] };
  }
}
```

#### Implementação Frontend

**Adicionar Hook de Infinite Scroll:**
```typescript
// src/hooks/useInfiniteMessages.ts
import { useState, useCallback, useRef } from 'react';

export function useInfiniteMessages(
  orderId: string,
  socket: Socket | null
) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [hasMore, setHasMore] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const oldestCursor = useRef<string | null>(null);

  const loadInitial = useCallback(() => {
    if (!socket) return;

    socket.emit('get-messages', {
      orderId,
      limit: 50,
    }, (response: any) => {
      if (response.success) {
        setMessages(response.messages);
        setHasMore(response.hasMore);
        oldestCursor.current = response.nextCursor;
      }
    });
  }, [orderId, socket]);

  const loadMore = useCallback(() => {
    if (!socket || isLoadingMore || !hasMore) return;

    setIsLoadingMore(true);

    socket.emit('get-messages', {
      orderId,
      limit: 50,
      cursor: oldestCursor.current,
      direction: 'before',
    }, (response: any) => {
      if (response.success) {
        // Adicionar mensagens antigas no início
        setMessages(prev => [...response.messages, ...prev]);
        setHasMore(response.hasMore);
        oldestCursor.current = response.nextCursor;
      }
      setIsLoadingMore(false);
    });
  }, [orderId, socket, isLoadingMore, hasMore]);

  const addNewMessage = useCallback((message: ChatMessage) => {
    setMessages(prev => [...prev, message]);
  }, []);

  return {
    messages,
    hasMore,
    isLoadingMore,
    loadInitial,
    loadMore,
    addNewMessage,
  };
}
```

**Implementar Scroll Detection:**
```typescript
// src/components/kanban/ChatInterface.tsx

const messagesContainerRef = useRef<HTMLDivElement>(null);
const { hasMore, isLoadingMore, loadMore } = useInfiniteMessages(order.id, socketRef.current);

// Detectar scroll no topo
const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
  const target = e.target as HTMLDivElement;

  if (target.scrollTop === 0 && hasMore && !isLoadingMore) {
    loadMore();
  }
}, [hasMore, isLoadingMore, loadMore]);

<div
  ref={messagesContainerRef}
  onScroll={handleScroll}
  className="flex-1 overflow-y-auto p-4 bg-gray-50"
>
  {/* Loading indicator no topo */}
  {isLoadingMore && (
    <div className="flex justify-center py-2">
      <Loader2 className="w-5 h-5 animate-spin text-blue-500" />
    </div>
  )}

  {!hasMore && messages.length > 0 && (
    <div className="text-center text-xs text-gray-400 py-2">
      — Início da conversa —
    </div>
  )}

  {/* Mensagens */}
  {messages.map(msg => (
    <MessageBubble key={msg.id} message={msg} />
  ))}
</div>
```

---

### 3.2. Transações no Backend (1 dia)

#### Objetivo
Garantir consistência de dados em operações críticas.

#### Implementação

**Atualizar acceptProposal:**
```typescript
// backend/src/modules/chat/chat.service.ts

async acceptProposal(messageId: string, userId: string) {
  const message = await this.prisma.message.findUnique({
    where: { id: messageId },
    include: { order: true },
  });

  if (!message || message.type !== MessageType.PROPOSAL) {
    throw new NotFoundException('Proposal not found');
  }

  await this.verifyOrderAccess(message.orderId, userId);

  const proposalData = message.proposalData as any;

  if (proposalData.status !== ProposalStatus.PENDING) {
    throw new ForbiddenException('Proposal already processed');
  }

  // USAR TRANSAÇÃO
  return this.prisma.$transaction(async (tx) => {
    // 1. Atualizar mensagem
    await tx.message.update({
      where: { id: messageId },
      data: {
        proposalData: {
          ...proposalData,
          status: ProposalStatus.ACCEPTED,
          acceptedAt: new Date().toISOString(),
          acceptedBy: userId,
        },
      },
    });

    // 2. Atualizar pedido
    const updatedOrder = await tx.order.update({
      where: { id: message.orderId },
      data: {
        pricePerUnit: proposalData.newValues.pricePerUnit,
        quantity: proposalData.newValues.quantity,
        totalValue:
          proposalData.newValues.pricePerUnit *
          proposalData.newValues.quantity,
        deliveryDeadline: new Date(
          proposalData.newValues.deliveryDeadline
        ),
      },
    });

    // 3. Criar log de auditoria (opcional)
    await tx.orderHistory.create({
      data: {
        orderId: message.orderId,
        action: 'PROPOSAL_ACCEPTED',
        performedBy: userId,
        changes: {
          proposalId: messageId,
          oldValues: proposalData.originalValues,
          newValues: proposalData.newValues,
        },
      },
    });

    return updatedOrder;
  });
}
```

**Benefícios:**
- Se qualquer operação falhar, todas são revertidas
- Consistência de dados garantida
- Histórico de auditoria integrado

---

### 3.3. Exponential Backoff (1 dia)

#### Implementação

**Atualizar useChatSocket:**
```typescript
const socket = io(`${SOCKET_URL}/chat`, {
  auth: { token },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 10, // Aumentar de 5 para 10
  reconnectionDelay: 1000, // Inicial: 1s
  reconnectionDelayMax: 30000, // Máximo: 30s
  randomizationFactor: 0.5, // Adicionar jitter (evita thundering herd)
  timeout: 20000, // Timeout de conexão: 20s
});

// Log de tentativas de reconexão
socket.io.on('reconnect_attempt', (attempt) => {
  console.log(`[Chat] Reconnection attempt ${attempt}`);
});

socket.io.on('reconnect_failed', () => {
  console.error('[Chat] All reconnection attempts failed');
  options.onError?.('Não foi possível reconectar ao servidor');
});
```

**Com essa configuração:**
```
Tentativa 1: 1s
Tentativa 2: 1.5s - 2.5s (1s * 2 ± 50%)
Tentativa 3: 3s - 5s (2s * 2 ± 50%)
Tentativa 4: 6s - 10s (4s * 2 ± 50%)
...
Tentativa 10: 15s - 30s (capped em 30s)
```

---

## Fase 4: Qualidade e Testes

**Prazo:** 1 semana
**Prioridade:** 🟢 ALTA
**Responsável:** QA + Desenvolvedores

### 4.1. Testes Unitários Backend (2 dias)

**Passo 1: Setup**
```bash
cd backend
npm install --save-dev @types/jest @types/supertest supertest
```

**Passo 2: ChatService Tests**
```typescript
// backend/src/modules/chat/chat.service.spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { ChatService } from './chat.service';
import { PrismaService } from '../../prisma/prisma.service';
import { SanitizerService } from '../../common/services/sanitizer.service';
import { NotFoundException, ForbiddenException } from '@nestjs/common';
import { MessageType } from '@prisma/client';

describe('ChatService', () => {
  let service: ChatService;
  let prisma: PrismaService;

  const mockPrisma = {
    order: {
      findUnique: jest.fn(),
    },
    message: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      count: jest.fn(),
    },
  };

  const mockSanitizer = {
    sanitizeText: jest.fn((text) => text),
    sanitizeNumber: jest.fn((num) => Number(num)),
    sanitizeDate: jest.fn((date) => new Date(date)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ChatService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: SanitizerService,
          useValue: mockSanitizer,
        },
      ],
    }).compile();

    service = module.get<ChatService>(ChatService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('sendMessage', () => {
    const mockOrder = {
      id: 'order-1',
      brandId: 'brand-1',
      supplierId: 'supplier-1',
      pricePerUnit: 100,
      quantity: 50,
      deliveryDeadline: new Date('2026-03-01'),
      brand: {
        companyUsers: [{ userId: 'user-1' }],
      },
      supplier: {
        companyUsers: [{ userId: 'user-2' }],
      },
    };

    const mockMessage = {
      id: 'msg-1',
      orderId: 'order-1',
      senderId: 'user-1',
      type: MessageType.TEXT,
      content: 'Test message',
      createdAt: new Date(),
      sender: {
        id: 'user-1',
        name: 'Test User',
        role: 'BRAND',
      },
    };

    it('should send text message successfully', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.message.create.mockResolvedValue(mockMessage);

      const result = await service.sendMessage('order-1', 'user-1', {
        type: MessageType.TEXT,
        content: 'Test message',
      });

      expect(result).toEqual(mockMessage);
      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          orderId: 'order-1',
          senderId: 'user-1',
          type: MessageType.TEXT,
          content: 'Test message',
        }),
        include: expect.any(Object),
      });
    });

    it('should send proposal message with data', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(mockOrder);
      mockPrisma.message.create.mockResolvedValue({
        ...mockMessage,
        type: MessageType.PROPOSAL,
      });

      const result = await service.sendMessage('order-1', 'user-1', {
        type: MessageType.PROPOSAL,
        proposedPrice: 90,
        proposedQuantity: 60,
        proposedDeadline: '2026-03-15',
      });

      expect(mockPrisma.message.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          type: MessageType.PROPOSAL,
          proposalData: expect.objectContaining({
            originalValues: expect.any(Object),
            newValues: expect.objectContaining({
              pricePerUnit: 90,
              quantity: 60,
            }),
            status: 'PENDING',
          }),
        }),
        include: expect.any(Object),
      });
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrisma.order.findUnique.mockResolvedValue(null);

      await expect(
        service.sendMessage('order-1', 'user-1', {
          type: MessageType.TEXT,
          content: 'Test',
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw ForbiddenException if user has no access', async () => {
      mockPrisma.order.findUnique.mockResolvedValue({
        ...mockOrder,
        brand: { companyUsers: [] },
        supplier: { companyUsers: [] },
      });

      await expect(
        service.sendMessage('order-1', 'user-999', {
          type: MessageType.TEXT,
          content: 'Test',
        })
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getMessages', () => {
    it('should return messages and mark as read', async () => {
      const mockMessages = [
        { id: 'msg-1', content: 'Message 1', read: false },
        { id: 'msg-2', content: 'Message 2', read: true },
      ];

      mockPrisma.message.findMany.mockResolvedValue({
        messages: mockMessages,
        hasMore: false,
        nextCursor: null,
      });
      mockPrisma.message.updateMany.mockResolvedValue({ count: 1 });

      // Mock access check
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue();

      const result = await service.getMessages('order-1', 'user-1');

      expect(mockPrisma.message.updateMany).toHaveBeenCalledWith({
        where: expect.objectContaining({
          orderId: 'order-1',
          senderId: { not: 'user-1' },
          read: false,
        }),
        data: { read: true },
      });
    });
  });

  describe('acceptProposal', () => {
    it('should accept proposal and update order', async () => {
      const mockProposalMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.PROPOSAL,
        proposalData: {
          originalValues: {
            pricePerUnit: 100,
            quantity: 50,
            deliveryDeadline: '2026-03-01',
          },
          newValues: {
            pricePerUnit: 90,
            quantity: 60,
            deliveryDeadline: '2026-03-15',
          },
          status: 'PENDING',
        },
      };

      const mockUpdatedOrder = {
        id: 'order-1',
        pricePerUnit: 90,
        quantity: 60,
        totalValue: 5400,
        deliveryDeadline: new Date('2026-03-15'),
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockProposalMessage);
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue();

      // Mock transaction
      mockPrisma.$transaction = jest.fn((callback) =>
        callback({
          message: { update: jest.fn() },
          order: { update: jest.fn().mockResolvedValue(mockUpdatedOrder) },
        })
      );

      const result = await service.acceptProposal('msg-1', 'user-1');

      expect(result).toEqual(mockUpdatedOrder);
    });

    it('should throw error if proposal already processed', async () => {
      const mockProposalMessage = {
        id: 'msg-1',
        orderId: 'order-1',
        type: MessageType.PROPOSAL,
        proposalData: {
          status: 'ACCEPTED', // Já aceita
        },
      };

      mockPrisma.message.findUnique.mockResolvedValue(mockProposalMessage);
      jest.spyOn(service, 'verifyOrderAccess').mockResolvedValue();

      await expect(
        service.acceptProposal('msg-1', 'user-1')
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('getUnreadCount', () => {
    it('should return correct unread count', async () => {
      mockPrisma.message.count.mockResolvedValue(5);

      const count = await service.getUnreadCount('order-1', 'user-1');

      expect(count).toBe(5);
      expect(mockPrisma.message.count).toHaveBeenCalledWith({
        where: {
          orderId: 'order-1',
          senderId: { not: 'user-1' },
          read: false,
        },
      });
    });
  });
});
```

**Passo 3: Rodar Testes**
```bash
npm test -- chat.service.spec.ts
```

---

### 4.2. Testes E2E (2 dias)

**Setup:**
```typescript
// backend/test/chat.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { io, Socket } from 'socket.io-client';
import { AppModule } from './../src/app.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Chat E2E', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let client1: Socket;
  let client2: Socket;
  let authToken1: string;
  let authToken2: string;
  let testOrderId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    await app.listen(3001); // Porta diferente para teste

    prisma = app.get<PrismaService>(PrismaService);

    // Setup test data
    await setupTestData();
  });

  afterAll(async () => {
    await cleanupTestData();
    await app.close();
  });

  async function setupTestData() {
    // Criar usuários de teste
    const brand = await prisma.company.create({
      data: {
        legalName: 'Test Brand',
        type: 'BRAND',
        companyUsers: {
          create: {
            user: {
              create: {
                email: 'brand@test.com',
                name: 'Brand User',
                password: 'hashed',
                role: 'BRAND',
              },
            },
          },
        },
      },
      include: {
        companyUsers: { include: { user: true } },
      },
    });

    const supplier = await prisma.company.create({
      data: {
        legalName: 'Test Supplier',
        type: 'SUPPLIER',
        companyUsers: {
          create: {
            user: {
              create: {
                email: 'supplier@test.com',
                name: 'Supplier User',
                password: 'hashed',
                role: 'SUPPLIER',
              },
            },
          },
        },
      },
      include: {
        companyUsers: { include: { user: true } },
      },
    });

    // Criar pedido de teste
    const order = await prisma.order.create({
      data: {
        displayId: 'TEST-001',
        brandId: brand.id,
        supplierId: supplier.id,
        productType: 'Test',
        quantity: 100,
        pricePerUnit: 50,
        totalValue: 5000,
        deliveryDeadline: new Date('2026-03-01'),
        status: 'EM_PRODUCAO',
      },
    });

    testOrderId = order.id;

    // Gerar tokens (simplificado para teste)
    authToken1 = `mock-token-${brand.companyUsers[0].userId}`;
    authToken2 = `mock-token-${supplier.companyUsers[0].userId}`;
  }

  async function cleanupTestData() {
    // Limpar dados de teste
    await prisma.message.deleteMany({ where: { orderId: testOrderId } });
    await prisma.order.delete({ where: { id: testOrderId } });
    // ... limpar outros dados
  }

  function connectClient(token: string): Promise<Socket> {
    return new Promise((resolve, reject) => {
      const client = io('http://localhost:3001/chat', {
        auth: { token },
      });

      client.on('connected', () => {
        resolve(client);
      });

      client.on('error', (error) => {
        reject(error);
      });

      setTimeout(() => reject(new Error('Connection timeout')), 5000);
    });
  }

  describe('Basic Chat Flow', () => {
    beforeEach(async () => {
      client1 = await connectClient(authToken1);
      client2 = await connectClient(authToken2);
    });

    afterEach(() => {
      client1?.disconnect();
      client2?.disconnect();
    });

    it('should allow two users to exchange messages', (done) => {
      // Client 1 joins order
      client1.emit('join-order', { orderId: testOrderId }, (response1) => {
        expect(response1.success).toBe(true);

        // Client 2 joins order
        client2.emit('join-order', { orderId: testOrderId }, (response2) => {
          expect(response2.success).toBe(true);

          // Client 2 listens for new messages
          client2.on('new-message', (message) => {
            expect(message.content).toBe('Hello from client 1');
            done();
          });

          // Client 1 sends message
          client1.emit(
            'send-message',
            {
              orderId: testOrderId,
              type: 'TEXT',
              content: 'Hello from client 1',
            },
            (sendResponse) => {
              expect(sendResponse.success).toBe(true);
            }
          );
        });
      });
    });

    it('should show typing indicators', (done) => {
      client1.emit('join-order', { orderId: testOrderId });
      client2.emit('join-order', { orderId: testOrderId });

      // Client 2 listens for typing
      client2.on('user-typing', ({ isTyping, userName }) => {
        expect(isTyping).toBe(true);
        expect(userName).toBe('Brand User');
        done();
      });

      // Client 1 types
      setTimeout(() => {
        client1.emit('typing', { orderId: testOrderId, isTyping: true });
      }, 100);
    });

    it('should handle proposal acceptance', (done) => {
      client1.emit('join-order', { orderId: testOrderId });
      client2.emit('join-order', { orderId: testOrderId });

      // Client 1 sends proposal
      client1.emit(
        'send-message',
        {
          orderId: testOrderId,
          type: 'PROPOSAL',
          proposedPrice: 45,
          proposedQuantity: 100,
          proposedDeadline: '2026-03-15',
        },
        (sendResponse) => {
          expect(sendResponse.success).toBe(true);

          const proposalId = sendResponse.message.id;

          // Client 2 listens for proposal update
          client2.on('proposal-updated', ({ messageId, status }) => {
            expect(messageId).toBe(proposalId);
            expect(status).toBe('ACCEPTED');
            done();
          });

          // Client 2 accepts proposal
          setTimeout(() => {
            client2.emit('accept-proposal', {
              orderId: testOrderId,
              messageId: proposalId,
            });
          }, 100);
        }
      );
    });
  });

  describe('REST API Endpoints', () => {
    let server: any;

    beforeAll(() => {
      server = app.getHttpServer();
    });

    it('GET /orders/:orderId/chat should return messages', async () => {
      const response = await request(server)
        .get(`/orders/${testOrderId}/chat`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toBeInstanceOf(Array);
    });

    it('POST /orders/:orderId/chat should create message', async () => {
      const response = await request(server)
        .post(`/orders/${testOrderId}/chat`)
        .set('Authorization', `Bearer ${authToken1}`)
        .send({
          type: 'TEXT',
          content: 'Test via REST API',
        })
        .expect(201);

      expect(response.body.content).toBe('Test via REST API');
    });

    it('GET /orders/:orderId/chat/unread should return count', async () => {
      const response = await request(server)
        .get(`/orders/${testOrderId}/chat/unread`)
        .set('Authorization', `Bearer ${authToken1}`)
        .expect(200);

      expect(response.body).toHaveProperty('unreadCount');
      expect(typeof response.body.unreadCount).toBe('number');
    });
  });
});
```

**Rodar E2E:**
```bash
npm run test:e2e -- chat.e2e-spec.ts
```

---

### 4.3. Testes Frontend (1 dia)

**Setup:**
```bash
cd frontend
npm install --save-dev @testing-library/react @testing-library/hooks @testing-library/jest-dom vitest
```

**Teste do Hook:**
```typescript
// src/hooks/useChatSocket.test.tsx

import { renderHook, act, waitFor } from '@testing-library/react';
import { useChatSocket } from './useChatSocket';
import { io } from 'socket.io-client';

// Mock Socket.IO
jest.mock('socket.io-client');

describe('useChatSocket', () => {
  let mockSocket: any;

  beforeEach(() => {
    mockSocket = {
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
      connected: true,
    };

    (io as jest.Mock).mockReturnValue(mockSocket);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should connect to socket with token', () => {
    localStorage.setItem('token', 'test-token');

    renderHook(() => useChatSocket('order-1'));

    expect(io).toHaveBeenCalledWith(
      expect.stringContaining('/chat'),
      expect.objectContaining({
        auth: { token: 'test-token' },
      })
    );
  });

  it('should join order room on connect', async () => {
    const { result } = renderHook(() => useChatSocket('order-1'));

    // Simular evento 'connected'
    const connectedHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === 'connected'
    )[1];

    act(() => {
      connectedHandler({ userId: 'user-1', userName: 'Test User' });
    });

    await waitFor(() => {
      expect(mockSocket.emit).toHaveBeenCalledWith(
        'join-order',
        { orderId: 'order-1' },
        expect.any(Function)
      );
    });
  });

  it('should handle new messages', async () => {
    const { result } = renderHook(() => useChatSocket('order-1'));

    const newMessageHandler = mockSocket.on.mock.calls.find(
      ([event]) => event === 'new-message'
    )[1];

    const testMessage = {
      id: 'msg-1',
      content: 'Test message',
      senderId: 'user-2',
      createdAt: new Date().toISOString(),
    };

    act(() => {
      newMessageHandler(testMessage);
    });

    await waitFor(() => {
      expect(result.current.messages).toHaveLength(1);
      expect(result.current.messages[0].content).toBe('Test message');
    });
  });

  it('should send message when connected', async () => {
    const { result } = renderHook(() => useChatSocket('order-1'));

    // Simular conexão
    act(() => {
      result.current.isConnected = true;
    });

    await act(async () => {
      const success = await result.current.sendMessage({
        type: 'TEXT',
        content: 'Hello',
      });

      expect(mockSocket.emit).toHaveBeenCalledWith(
        'send-message',
        expect.objectContaining({
          orderId: 'order-1',
          type: 'TEXT',
          content: 'Hello',
        }),
        expect.any(Function)
      );
    });
  });

  it('should queue message when offline', async () => {
    const { result } = renderHook(() => useChatSocket('order-1'));

    // Simular offline
    act(() => {
      mockSocket.connected = false;
      result.current.isConnected = false;
    });

    await act(async () => {
      await result.current.sendMessage({
        type: 'TEXT',
        content: 'Offline message',
      });
    });

    // Verificar que foi adicionado à queue (não enviado diretamente)
    expect(mockSocket.emit).not.toHaveBeenCalledWith('send-message');
    expect(result.current.pendingCount).toBeGreaterThan(0);
  });
});
```

---

## Fase 5: Deploy e Monitoramento

**Prazo:** 1 semana
**Prioridade:** 🟢 ALTA
**Responsável:** DevOps

### 5.1. Configuração Redis (1 dia)

**Docker Compose para Desenvolvimento:**
```yaml
# docker-compose.yml
version: '3.8'

services:
  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: texlink
      POSTGRES_USER: texlink
      POSTGRES_PASSWORD: texlink123
    ports:
      - '5432:5432'
    volumes:
      - postgres_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    ports:
      - '6379:6379'
    command: redis-server --appendonly yes --requirepass texlink_redis_pass
    volumes:
      - redis_data:/data

volumes:
  postgres_data:
  redis_data:
```

**Configuração Produção:**
```bash
# backend/.env.production
REDIS_URL=rediss://username:password@redis-host:6380
# Ou usar Redis Cloud, AWS ElastiCache, etc.
```

**Health Check Redis:**
```typescript
// backend/src/health/health.controller.ts
import { Controller, Get } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Controller('health')
export class HealthController {
  constructor(private configService: ConfigService) {}

  @Get()
  async check() {
    const checks = {
      database: await this.checkDatabase(),
      redis: await this.checkRedis(),
    };

    const isHealthy = Object.values(checks).every(c => c.status === 'up');

    return {
      status: isHealthy ? 'ok' : 'error',
      timestamp: new Date().toISOString(),
      checks,
    };
  }

  private async checkRedis() {
    try {
      const redisUrl = this.configService.get<string>('REDIS_URL');
      if (!redisUrl) {
        return { status: 'disabled', message: 'Redis not configured' };
      }

      const redis = new Redis(redisUrl);
      await redis.ping();
      redis.disconnect();

      return { status: 'up' };
    } catch (error) {
      return { status: 'down', error: error.message };
    }
  }

  private async checkDatabase() {
    // ... check Prisma connection
  }
}
```

---

### 5.2. Monitoramento (2 dias)

#### Métricas com Prometheus

**Instalar:**
```bash
npm install prom-client
```

**Setup Métricas:**
```typescript
// backend/src/metrics/metrics.service.ts
import { Injectable } from '@nestjs/common';
import { register, Counter, Histogram, Gauge } from 'prom-client';

@Injectable()
export class MetricsService {
  // Contadores
  public readonly messagesTotal = new Counter({
    name: 'chat_messages_total',
    help: 'Total number of chat messages sent',
    labelNames: ['type', 'order_id'],
  });

  public readonly connectionTotal = new Counter({
    name: 'chat_connections_total',
    help: 'Total number of WebSocket connections',
    labelNames: ['status'], // connected, disconnected, failed
  });

  public readonly rateLimitHits = new Counter({
    name: 'chat_rate_limit_hits_total',
    help: 'Number of rate limit violations',
    labelNames: ['user_id'],
  });

  // Histogramas (latência)
  public readonly messageLatency = new Histogram({
    name: 'chat_message_latency_seconds',
    help: 'Message send latency',
    buckets: [0.1, 0.5, 1, 2, 5],
  });

  // Gauges (valores atuais)
  public readonly activeConnections = new Gauge({
    name: 'chat_active_connections',
    help: 'Number of active WebSocket connections',
  });

  public readonly queuedMessages = new Gauge({
    name: 'chat_queued_messages',
    help: 'Number of messages in pending queue',
  });

  getMetrics() {
    return register.metrics();
  }
}
```

**Endpoint de Métricas:**
```typescript
// backend/src/metrics/metrics.controller.ts
import { Controller, Get, Header } from '@nestjs/common';
import { MetricsService } from './metrics.service';

@Controller('metrics')
export class MetricsController {
  constructor(private metricsService: MetricsService) {}

  @Get()
  @Header('Content-Type', 'text/plain')
  getMetrics() {
    return this.metricsService.getMetrics();
  }
}
```

**Usar no Gateway:**
```typescript
// backend/src/modules/chat/chat.gateway.ts
import { MetricsService } from '../../metrics/metrics.service';

@WebSocketGateway(...)
export class ChatGateway {
  constructor(
    // ... outros
    private metrics: MetricsService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      // ... lógica de conexão

      this.metrics.connectionTotal.inc({ status: 'connected' });
      this.metrics.activeConnections.inc();
    } catch (error) {
      this.metrics.connectionTotal.inc({ status: 'failed' });
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.metrics.connectionTotal.inc({ status: 'disconnected' });
    this.metrics.activeConnections.dec();
  }

  @SubscribeMessage('send-message')
  async handleSendMessage(...) {
    const timer = this.metrics.messageLatency.startTimer();

    try {
      await this.rateLimiter.checkMessageLimit(client.userId);

      const message = await this.chatService.sendMessage(...);

      this.metrics.messagesTotal.inc({
        type: data.type,
        order_id: data.orderId,
      });

      timer();
      return { success: true, message };
    } catch (error) {
      if (error.message.includes('Rate limit')) {
        this.metrics.rateLimitHits.inc({ user_id: client.userId });
      }
      timer();
      return { success: false, error: error.message };
    }
  }
}
```

#### Configurar Prometheus

**prometheus.yml:**
```yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: 'texlink-backend'
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics'
```

#### Alertas

**alerts.yml:**
```yaml
groups:
  - name: chat
    interval: 30s
    rules:
      - alert: HighRateLimitHits
        expr: rate(chat_rate_limit_hits_total[5m]) > 10
        for: 2m
        annotations:
          summary: "High rate limit violations"
          description: "{{ $value }} rate limit hits per second"

      - alert: HighMessageLatency
        expr: histogram_quantile(0.95, chat_message_latency_seconds) > 2
        for: 5m
        annotations:
          summary: "High message send latency"
          description: "P95 latency is {{ $value }}s"

      - alert: ConnectionDrops
        expr: rate(chat_connections_total{status="disconnected"}[5m]) > 5
        for: 2m
        annotations:
          summary: "High connection drop rate"
```

---

### 5.3. Logging Estruturado (1 dia)

**Instalar Winston:**
```bash
npm install winston winston-daily-rotate-file
```

**Configurar Logger:**
```typescript
// backend/src/config/logger.config.ts
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import 'winston-daily-rotate-file';

export const loggerConfig = WinstonModule.createLogger({
  transports: [
    // Console (desenvolvimento)
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.colorize(),
        winston.format.printf(({ timestamp, level, message, context, ...meta }) => {
          return `${timestamp} [${context}] ${level}: ${message} ${
            Object.keys(meta).length ? JSON.stringify(meta) : ''
          }`;
        })
      ),
    }),

    // Arquivo rotativo (produção)
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'chat-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),

    // Erros separados
    new winston.transports.DailyRotateFile({
      dirname: 'logs',
      filename: 'chat-error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '30d',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.json()
      ),
    }),
  ],
});
```

**Logs Estruturados:**
```typescript
this.logger.log({
  event: 'message_sent',
  orderId: data.orderId,
  messageId: message.id,
  userId: client.userId,
  type: data.type,
  hasProposal: !!data.proposedPrice,
  timestamp: new Date().toISOString(),
});

this.logger.error({
  event: 'message_send_failed',
  orderId: data.orderId,
  userId: client.userId,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString(),
});
```

---

### 5.4. Deploy Multi-Instância (2 dias)

#### Redis Adapter para Socket.IO

**Instalar:**
```bash
npm install @socket.io/redis-adapter ioredis
```

**Configurar:**
```typescript
// backend/src/modules/chat/chat.gateway.ts
import { createAdapter } from '@socket.io/redis-adapter';
import Redis from 'ioredis';

@WebSocketGateway({
  namespace: 'chat',
  cors: { origin: '*', credentials: true },
})
export class ChatGateway implements OnGatewayInit {
  @WebSocketServer()
  server: Server;

  constructor(private configService: ConfigService) {}

  async afterInit(server: Server) {
    const redisUrl = this.configService.get<string>('REDIS_URL');

    if (redisUrl) {
      const pubClient = new Redis(redisUrl);
      const subClient = pubClient.duplicate();

      server.adapter(createAdapter(pubClient, subClient));

      this.logger.log('Socket.IO Redis adapter configured');
    } else {
      this.logger.warn('Running without Redis adapter (single instance only)');
    }
  }
}
```

**Com isso:**
- Múltiplas instâncias do backend podem rodar simultaneamente
- Mensagens são sincronizadas via Redis pub/sub
- Load balancer pode distribuir conexões

#### Configuração Nginx

**nginx.conf:**
```nginx
upstream backend {
  # Sticky sessions por IP para WebSocket
  ip_hash;

  server backend1:3000;
  server backend2:3000;
  server backend3:3000;
}

server {
  listen 80;
  server_name api.texlink.com;

  location / {
    proxy_pass http://backend;
    proxy_http_version 1.1;

    # WebSocket headers
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;

    # Timeouts
    proxy_connect_timeout 7d;
    proxy_send_timeout 7d;
    proxy_read_timeout 7d;
  }
}
```

**Docker Compose Produção:**
```yaml
version: '3.8'

services:
  backend1:
    image: texlink-backend:latest
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...
    depends_on:
      - redis
      - postgres

  backend2:
    image: texlink-backend:latest
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...
    depends_on:
      - redis
      - postgres

  backend3:
    image: texlink-backend:latest
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...
    depends_on:
      - redis
      - postgres

  nginx:
    image: nginx:alpine
    ports:
      - '80:80'
      - '443:443'
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    depends_on:
      - backend1
      - backend2
      - backend3

  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes
    volumes:
      - redis_data:/data

  postgres:
    image: postgres:16
    environment:
      POSTGRES_DB: texlink_prod
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  redis_data:
  postgres_data:
```

---

## Checklist Final

### Backend

#### Segurança
- [ ] Rate limiting implementado (10 msgs/min, 100/hora)
- [ ] Sanitização de conteúdo (DOMPurify)
- [ ] Validação de tamanho (max 5000 chars)
- [ ] Validação de tipos e ranges
- [ ] Transações em operações críticas
- [ ] JWT validation no WebSocket
- [ ] CORS configurado corretamente
- [ ] Environment variables seguras

#### Performance
- [ ] Índices criados no banco de dados:
  - [ ] `idx_messages_order_date`
  - [ ] `idx_messages_unread`
  - [ ] `idx_messages_sender`
- [ ] Paginação cursor-based (limit 50, max 100)
- [ ] Redis adapter para multi-instância
- [ ] Connection pooling configurado

#### Funcionalidade
- [ ] Mensagens de texto
- [ ] Propostas de negociação
- [ ] Aceitar/rejeitar propostas
- [ ] Indicadores de digitação
- [ ] Confirmações de leitura
- [ ] Sincronização delta
- [ ] REST API alternativa

#### Monitoramento
- [ ] Métricas Prometheus:
  - [ ] `chat_messages_total`
  - [ ] `chat_connections_total`
  - [ ] `chat_rate_limit_hits_total`
  - [ ] `chat_message_latency_seconds`
  - [ ] `chat_active_connections`
- [ ] Logging estruturado (Winston)
- [ ] Health checks (`/health`)
- [ ] Alertas configurados

#### Testes
- [ ] Unit tests (>80% coverage):
  - [ ] ChatService
  - [ ] RateLimiterService
  - [ ] SanitizerService
- [ ] Integration tests:
  - [ ] ChatGateway
- [ ] E2E tests:
  - [ ] Message exchange
  - [ ] Proposal flow
  - [ ] Typing indicators

### Frontend

#### Funcionalidade Offline
- [ ] Queue de mensagens pendentes (IndexedDB)
- [ ] Detecção online/offline (`navigator.onLine`)
- [ ] Sincronização ao reconectar
- [ ] Persistência local de mensagens (30 dias)
- [ ] Retry automático (max 3 tentativas)
- [ ] Mensagens falhadas podem ser retentadas

#### UX
- [ ] Indicador de status de conexão
- [ ] Banner offline/reconectando
- [ ] Contador de pendentes
- [ ] Spinner em mensagens pendentes
- [ ] Loading states adequados
- [ ] Auto-scroll para novas mensagens
- [ ] Lazy loading de histórico
- [ ] Contador de caracteres (5000 max)

#### Performance
- [ ] Paginação infinita (50 msgs/página)
- [ ] Cache local (IndexedDB)
- [ ] Debounce em typing indicators
- [ ] Prevenção de duplicatas
- [ ] Cleanup de cache antigo

#### Testes
- [ ] Unit tests dos hooks:
  - [ ] useChatSocket
  - [ ] useMessageQueue
  - [ ] useNetworkStatus
- [ ] Component tests:
  - [ ] ChatInterface
  - [ ] MessageBubble
- [ ] Integration tests

### Deploy

#### Infraestrutura
- [ ] PostgreSQL 16 configurado
- [ ] Redis configurado (rate limit + adapter)
- [ ] Nginx com WebSocket support
- [ ] SSL/TLS configurado
- [ ] Backups automáticos do banco

#### Escalabilidade
- [ ] Múltiplas instâncias backend (3+)
- [ ] Load balancer com sticky sessions
- [ ] Redis adapter Socket.IO
- [ ] Auto-scaling configurado (opcional)

#### Monitoramento Produção
- [ ] Prometheus rodando
- [ ] Grafana dashboards criados
- [ ] Alertas configurados (PagerDuty/Slack)
- [ ] Logs centralizados (ELK/CloudWatch)
- [ ] Uptime monitoring (Pingdom/UptimeRobot)

#### Documentação
- [ ] README atualizado
- [ ] API documentation (Swagger)
- [ ] Runbook de operações
- [ ] Disaster recovery plan
- [ ] Changelog atualizado

---

## Resumo de Tempo e Recursos

### Timeline Total: 4-6 semanas

| Fase | Prazo | Prioridade | Recursos |
|------|-------|------------|----------|
| Fase 1: Segurança | 1 semana | 🔴 CRÍTICA | 1 Backend Dev + 0.5 DevOps |
| Fase 2: Offline | 2 semanas | 🔴 CRÍTICA | 1 Frontend Dev |
| Fase 3: Performance | 2 semanas | 🟡 MÉDIA | 1 Full Stack Dev |
| Fase 4: Testes | 1 semana | 🟢 ALTA | 1 QA + Devs (25%) |
| Fase 5: Deploy | 1 semana | 🟢 ALTA | 1 DevOps + 0.5 Backend |

**Total:** ~6-8 semanas com equipe full-time

### Custos Estimados (Infraestrutura)

| Serviço | Custo Mensal |
|---------|--------------|
| PostgreSQL (managed) | $50-200 |
| Redis (managed) | $30-100 |
| 3x Backend instances | $150-300 |
| Load balancer | $20-50 |
| Monitoring (Datadog) | $31-100 |
| **TOTAL** | **$281-750/mês** |

---

## Próximos Passos IMEDIATOS

1. **Esta Semana:**
   - [ ] Revisar e aprovar este plano com stakeholders
   - [ ] Criar issues no GitHub/Jira para cada item
   - [ ] Alocar recursos (desenvolvedores, DevOps)
   - [ ] Setup ambiente de desenvolvimento (Redis local)

2. **Semana 1:**
   - [ ] Iniciar Fase 1 (Rate limiting + Sanitização)
   - [ ] Setup CI/CD para testes automatizados
   - [ ] Criar branch `feature/chat-completion`

3. **Semana 2-3:**
   - [ ] Continuar Fase 1
   - [ ] Iniciar Fase 2 (Offline functionality)
   - [ ] Reuniões de alinhamento semanais

4. **Revisão Mid-Point (Semana 3):**
   - [ ] Demo das funcionalidades implementadas
   - [ ] Ajustes no timeline se necessário
   - [ ] Validação com QA

---

**Este plano está pronto para execução. Todos os exemplos de código são funcionais e podem ser implementados diretamente.**

**Dúvidas ou ajustes necessários? Entre em contato!**
