# Sistema de Chat em Tempo Real

## Visão Geral

O sistema de chat permite comunicação em tempo real entre marcas e facções no contexto de pedidos específicos, com suporte a propostas de negociação, indicadores de digitação e notificações.

## Arquitetura

```
┌─────────────────┐         WebSocket          ┌──────────────────┐
│  React Client   │◄─────────────────────────►│   ChatGateway    │
│  (useChatSocket)│      Socket.IO/WS          │   (NestJS)       │
└─────────────────┘                            └────────┬─────────┘
                                                        │
                                                        │
                                               ┌────────▼─────────┐
                                               │   ChatService    │
                                               │  (Business Logic)│
                                               └────────┬─────────┘
                                                        │
                                                        │
                                               ┌────────▼─────────┐
                                               │  PrismaService   │
                                               │   (Database)     │
                                               └──────────────────┘
```

## Tecnologias

- **Backend**: Socket.IO (NestJS WebSocket Gateway)
- **Frontend**: Socket.IO Client + React Hook
- **Autenticação**: JWT tokens
- **Persistência**: PostgreSQL (via Prisma)

## Fluxo de Comunicação

### 1. Conexão

```typescript
// Client conecta ao namespace /chat
const socket = io('http://localhost:3000/chat', {
  auth: {
    token: 'jwt-token-here'
  }
});

// Server valida token e autentica
socket.on('connected', ({ userId, userName, socketId }) => {
  console.log('Connected:', userId, userName);
});
```

### 2. Join Order Room

```typescript
// Client entra na sala do pedido
socket.emit('join-order', { orderId: 'order-123' }, (response) => {
  if (response.success) {
    console.log('Joined room:', response.room);
    console.log('Unread count:', response.unreadCount);
  }
});

// Outros usuários são notificados
socket.on('user-joined', ({ userId, userName }) => {
  console.log(`${userName} entrou na conversa`);
});
```

### 3. Enviar Mensagem

```typescript
// Enviar mensagem de texto
socket.emit('send-message', {
  orderId: 'order-123',
  type: 'TEXT',
  content: 'Olá! Quando consegue entregar?'
}, (response) => {
  if (response.success) {
    console.log('Message sent:', response.message);
  }
});

// Todos na sala recebem
socket.on('new-message', (message) => {
  console.log('New message:', message);
  // Atualiza UI
});
```

### 4. Enviar Proposta

```typescript
// Enviar contra-proposta
socket.emit('send-message', {
  orderId: 'order-123',
  type: 'PROPOSAL',
  content: 'Consigo fazer por este valor e prazo:',
  proposedPrice: 15000,
  proposedQuantity: 1000,
  proposedDeadline: '2025-02-28'
}, (response) => {
  console.log('Proposal sent:', response.message);
});
```

### 5. Indicador de Digitação

```typescript
// Notificar que está digitando
socket.emit('typing', {
  orderId: 'order-123',
  isTyping: true
});

// Outros recebem
socket.on('user-typing', ({ userId, userName, isTyping }) => {
  if (isTyping) {
    showTypingIndicator(userName);
  } else {
    hideTypingIndicator(userName);
  }
});

// Parar de digitar após 2s de inatividade
clearTimeout(typingTimeout);
typingTimeout = setTimeout(() => {
  socket.emit('typing', { orderId, isTyping: false });
}, 2000);
```

### 6. Marcar como Lido

```typescript
// Marcar mensagens como lidas
socket.emit('mark-read', { orderId: 'order-123' });

// Outros são notificados
socket.on('messages-read', ({ orderId, userId, userName }) => {
  console.log(`${userName} leu as mensagens`);
  // Atualizar checkmarks
});
```

### 7. Aceitar/Rejeitar Proposta

```typescript
// Aceitar proposta
socket.emit('accept-proposal', {
  orderId: 'order-123',
  messageId: 'msg-456'
}, (response) => {
  if (response.success) {
    console.log('Proposal accepted');
  }
});

// Todos recebem atualização
socket.on('proposal-updated', ({ messageId, status, updatedOrder }) => {
  if (status === 'ACCEPTED') {
    // Atualiza pedido com novos valores
    updateOrder(updatedOrder);
  }
});
```

## Estrutura de Dados

### Message

```typescript
{
  id: string                        // UUID
  orderId: string
  senderId: string
  type: 'TEXT' | 'PROPOSAL'        // Tipo de mensagem

  // Conteúdo
  content: string?                  // Texto da mensagem

  // Proposta (apenas se type === 'PROPOSAL')
  proposedPrice: number?
  proposedQuantity: number?
  proposedDeadline: DateTime?

  // Metadata
  readBy: string[]                  // IDs dos usuários que leram
  readAt: DateTime[]                // Quando cada um leu

  createdAt: DateTime
  updatedAt: DateTime

  // Relacionamentos
  sender: User
  order: Order
}
```

## Eventos WebSocket

### Client → Server

| Evento | Payload | Response | Descrição |
|--------|---------|----------|-----------|
| `join-order` | `{ orderId }` | `{ success, room, unreadCount }` | Entrar na sala do pedido |
| `leave-order` | `{ orderId }` | `{ success }` | Sair da sala |
| `send-message` | `SendMessagePayload` | `{ success, message }` | Enviar mensagem/proposta |
| `typing` | `{ orderId, isTyping }` | `{ success }` | Indicar digitação |
| `mark-read` | `{ orderId }` | `{ success }` | Marcar como lido |
| `get-messages` | `{ orderId }` | `{ success, messages }` | Buscar histórico |
| `accept-proposal` | `{ orderId, messageId }` | `{ success }` | Aceitar proposta |
| `reject-proposal` | `{ orderId, messageId }` | `{ success }` | Rejeitar proposta |

### Server → Client

| Evento | Payload | Descrição |
|--------|---------|-----------|
| `connected` | `{ userId, userName, socketId }` | Confirmação de conexão |
| `user-joined` | `{ userId, userName }` | Usuário entrou na sala |
| `user-left` | `{ userId, userName }` | Usuário saiu da sala |
| `new-message` | `Message` | Nova mensagem recebida |
| `user-typing` | `{ userId, userName, isTyping }` | Indicador de digitação |
| `messages-read` | `{ orderId, userId, userName }` | Mensagens lidas |
| `proposal-updated` | `{ messageId, status, updatedOrder? }` | Proposta aceita/rejeitada |
| `error` | `{ message }` | Erro ocorreu |

## React Hook (Frontend)

### useChatSocket.ts

```typescript
import { useEffect, useRef, useState } from 'react';
import { io, Socket } from 'socket.io-client';

export const useChatSocket = (orderId: string) => {
  const socketRef = useRef<Socket>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isConnected, setIsConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);

  useEffect(() => {
    // Conectar ao WebSocket
    const token = localStorage.getItem('authToken');
    const socket = io('http://localhost:3000/chat', {
      auth: { token }
    });

    socketRef.current = socket;

    // Handlers de conexão
    socket.on('connected', ({ userId, userName }) => {
      setIsConnected(true);
      console.log('Connected:', userName);
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    // Join order room
    socket.emit('join-order', { orderId }, (response) => {
      if (response.success) {
        setUnreadCount(response.unreadCount);
      }
    });

    // Listener de novas mensagens
    socket.on('new-message', (message: Message) => {
      setMessages(prev => [...prev, message]);
      // Auto-scroll to bottom
    });

    // Typing indicator
    socket.on('user-typing', ({ userName, isTyping }) => {
      setTypingUsers(prev => {
        if (isTyping) {
          return [...prev, userName];
        } else {
          return prev.filter(u => u !== userName);
        }
      });
    });

    // Proposal updates
    socket.on('proposal-updated', ({ messageId, status, updatedOrder }) => {
      // Atualizar mensagem específica
      setMessages(prev => prev.map(msg =>
        msg.id === messageId
          ? { ...msg, proposalStatus: status }
          : msg
      ));

      if (updatedOrder) {
        // Atualizar dados do pedido
        updateOrderContext(updatedOrder);
      }
    });

    // Cleanup
    return () => {
      socket.emit('leave-order', { orderId });
      socket.disconnect();
    };
  }, [orderId]);

  // Send message
  const sendMessage = (content: string) => {
    socketRef.current?.emit('send-message', {
      orderId,
      type: 'TEXT',
      content
    }, (response) => {
      if (!response.success) {
        console.error('Failed to send message:', response.error);
      }
    });
  };

  // Send proposal
  const sendProposal = (proposal: {
    content: string;
    proposedPrice: number;
    proposedQuantity: number;
    proposedDeadline: string;
  }) => {
    socketRef.current?.emit('send-message', {
      orderId,
      type: 'PROPOSAL',
      ...proposal
    }, (response) => {
      if (!response.success) {
        console.error('Failed to send proposal:', response.error);
      }
    });
  };

  // Typing indicator
  const setTyping = (isTyping: boolean) => {
    socketRef.current?.emit('typing', { orderId, isTyping });
  };

  // Mark as read
  const markAsRead = () => {
    socketRef.current?.emit('mark-read', { orderId });
    setUnreadCount(0);
  };

  // Accept proposal
  const acceptProposal = (messageId: string) => {
    socketRef.current?.emit('accept-proposal', {
      orderId,
      messageId
    });
  };

  // Reject proposal
  const rejectProposal = (messageId: string) => {
    socketRef.current?.emit('reject-proposal', {
      orderId,
      messageId
    });
  };

  return {
    messages,
    unreadCount,
    isConnected,
    typingUsers,
    sendMessage,
    sendProposal,
    setTyping,
    markAsRead,
    acceptProposal,
    rejectProposal
  };
};
```

## Componente de Chat (Exemplo)

```typescript
import { useChatSocket } from '../hooks/useChatSocket';

export const ChatInterface = ({ orderId }: { orderId: string }) => {
  const {
    messages,
    isConnected,
    typingUsers,
    sendMessage,
    sendProposal,
    setTyping,
    markAsRead,
    acceptProposal,
    rejectProposal
  } = useChatSocket(orderId);

  const [inputValue, setInputValue] = useState('');
  const typingTimeoutRef = useRef<NodeJS.Timeout>();

  useEffect(() => {
    // Mark as read when component mounts or new messages arrive
    markAsRead();
  }, [messages.length]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setInputValue(e.target.value);

    // Typing indicator
    setTyping(true);
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTyping(false);
    }, 2000);
  };

  const handleSend = () => {
    if (!inputValue.trim()) return;

    sendMessage(inputValue);
    setInputValue('');
    setTyping(false);
  };

  return (
    <div className="chat-interface">
      {/* Connection status */}
      <div className="chat-status">
        {isConnected ? '🟢 Conectado' : '🔴 Desconectado'}
      </div>

      {/* Messages */}
      <div className="chat-messages">
        {messages.map(msg => (
          <MessageBubble
            key={msg.id}
            message={msg}
            onAcceptProposal={acceptProposal}
            onRejectProposal={rejectProposal}
          />
        ))}
      </div>

      {/* Typing indicator */}
      {typingUsers.length > 0 && (
        <div className="typing-indicator">
          {typingUsers.join(', ')} {typingUsers.length === 1 ? 'está' : 'estão'} digitando...
        </div>
      )}

      {/* Input */}
      <div className="chat-input">
        <input
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onKeyPress={e => e.key === 'Enter' && handleSend()}
          placeholder="Digite sua mensagem..."
        />
        <button onClick={handleSend}>Enviar</button>
      </div>
    </div>
  );
};
```

## Autenticação

### JWT Token Validation

```typescript
// ChatGateway valida token no handshake
async handleConnection(client: AuthenticatedSocket) {
  const token = client.handshake.auth?.token;

  if (!token) {
    client.disconnect();
    return;
  }

  try {
    // Verify JWT
    const payload = this.jwtService.verify(token);
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub }
    });

    if (!user) {
      client.disconnect();
      return;
    }

    // Attach user info to socket
    client.userId = user.id;
    client.userName = user.name;

    // Track user's connections
    this.userSockets.set(user.id, client.id);

  } catch (error) {
    client.disconnect();
  }
}
```

### Mock Tokens (Desenvolvimento)

```typescript
// Suporte a mock tokens para demo
if (token.startsWith('mock-token-')) {
  const role = token.split('-')[2]; // mock-token-brand
  const demoUserId = demoUserIds[role];
  // ... use demo user
}
```

## Autorização

### Order Access Control

```typescript
// Verifica se usuário tem acesso ao pedido
async verifyOrderAccess(orderId: string, userId: string) {
  const order = await this.prisma.order.findUnique({
    where: { id: orderId },
    include: {
      brand: { include: { users: true } },
      supplier: { include: { users: true } }
    }
  });

  if (!order) {
    throw new NotFoundException('Pedido não encontrado');
  }

  // User must belong to brand or supplier
  const isBrandUser = order.brand.users.some(u => u.id === userId);
  const isSupplierUser = order.supplier?.users.some(u => u.id === userId);

  if (!isBrandUser && !isSupplierUser) {
    throw new ForbiddenException('Sem acesso a este pedido');
  }
}
```

## Segurança

### Rate Limiting

```typescript
// Limite de mensagens por minuto
const rateLimiter = {
  maxMessages: 20,
  windowMs: 60000  // 1 minuto
};

// Implementação
if (userMessageCount > rateLimiter.maxMessages) {
  socket.emit('error', {
    message: 'Você está enviando mensagens muito rápido. Aguarde um momento.'
  });
  return;
}
```

### Input Sanitization

```typescript
// Sanitiza conteúdo antes de salvar
const sanitizedContent = DOMPurify.sanitize(message.content, {
  ALLOWED_TAGS: [],  // Remove all HTML
  ALLOWED_ATTR: []
});
```

### XSS Protection

```typescript
// Frontend usa React (auto-escaping)
<div className="message-content">
  {message.content}  {/* React escapa automaticamente */}
</div>
```

## Performance

### Database Indexes

```prisma
model Message {
  // ...
  @@index([orderId, createdAt])
  @@index([senderId])
  @@index([orderId, readBy])
}
```

### Paginação de Mensagens

```typescript
// Carregar mensagens antigas on-demand
const getMessages = async (orderId: string, page: number = 1) => {
  const limit = 50;
  const skip = (page - 1) * limit;

  return prisma.message.findMany({
    where: { orderId },
    orderBy: { createdAt: 'desc' },
    take: limit,
    skip,
    include: {
      sender: { select: { id: true, name: true, avatar: true } }
    }
  });
};
```

### Connection Pooling

```typescript
// Reusar conexões WebSocket
private readonly userSockets: Map<string, Set<string>> = new Map();

// Um usuário pode ter múltiplas tabs abertas
this.userSockets.get(userId)?.forEach(socketId => {
  this.server.to(socketId).emit('notification', data);
});
```

## Monitoramento

### Métricas

```typescript
// Prometheus metrics
websocket_connections_total
websocket_messages_sent_total{order_id, user_id}
websocket_message_latency_seconds
websocket_errors_total{error_type}
```

### Logs

```typescript
{
  timestamp: "2025-01-27T10:00:00Z",
  level: "info",
  gateway: "chat",
  event: "message_sent",
  orderId: "order-123",
  userId: "user-456",
  messageType: "TEXT",
  latency: 45  // ms
}
```

## Testes

### Unit Tests

```typescript
describe('ChatGateway', () => {
  it('should authenticate user on connection', async () => {
    const socket = await createMockSocket(validToken);
    expect(socket.userId).toBeDefined();
  });

  it('should reject invalid token', async () => {
    const socket = await createMockSocket('invalid-token');
    expect(socket.connected).toBe(false);
  });
});
```

### Integration Tests

```typescript
describe('Chat E2E', () => {
  it('should send and receive messages', async () => {
    const client1 = await connectClient(brandToken);
    const client2 = await connectClient(supplierToken);

    await client1.emit('join-order', { orderId });
    await client2.emit('join-order', { orderId });

    const messagePromise = new Promise(resolve => {
      client2.on('new-message', resolve);
    });

    client1.emit('send-message', {
      orderId,
      type: 'TEXT',
      content: 'Hello'
    });

    const received = await messagePromise;
    expect(received.content).toBe('Hello');
  });
});
```

## Troubleshooting

### Conexão não estabelece

1. Verificar se JWT token é válido
2. Confirmar CORS configurado corretamente
3. Checar se porta 3000 está acessível
4. Verificar logs do gateway

### Mensagens não chegam

1. Confirmar que ambos entraram na sala (`join-order`)
2. Verificar autorização do pedido
3. Checar logs de erros
4. Testar com Socket.IO inspector

### Performance degradada

1. Adicionar índices no banco de dados
2. Implementar paginação de mensagens
3. Usar Redis para pub/sub em múltiplas instâncias
4. Otimizar queries Prisma

### Múltiplas instâncias (Horizontal scaling)

```typescript
// Usar Redis Adapter para Socket.IO
import { RedisAdapter } from '@socket.io/redis-adapter';

const pubClient = createClient({ url: 'redis://localhost:6379' });
const subClient = pubClient.duplicate();

io.adapter(new RedisAdapter(pubClient, subClient));
```

## Próximos Passos

- [ ] File upload em mensagens (imagens, PDFs)
- [ ] Mensagens de voz
- [ ] Reações em mensagens (emoji)
- [ ] Mentions (@username)
- [ ] Thread de respostas
- [ ] Busca em histórico
- [ ] Export de conversas
- [ ] Push notifications mobile
- [ ] Encryption end-to-end
