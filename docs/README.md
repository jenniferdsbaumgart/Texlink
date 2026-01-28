# Texlink - Technical Documentation

Welcome to the Texlink technical documentation. This directory contains detailed documentation for all major modules and systems.

## Module Documentation

### Core Modules

- **[Supplier Credentialing System](modules/supplier-credentials.md)**
  - Complete supplier onboarding workflow
  - CNPJ validation and compliance analysis
  - Multi-stage status management
  - Invitation and activation process

- **[External Integrations](modules/integrations.md)**
  - CNPJ validation providers (Brasil API, ReceitaWS)
  - Credit analysis integration (Mock, Serasa, Boa Vista)
  - Notification services (SendGrid, Twilio)
  - Integration patterns and error handling

- **[Real-time Chat](modules/realtime-chat.md)**
  - WebSocket-based messaging with Socket.IO
  - Order-specific chat rooms
  - Proposal negotiation
  - Typing indicators and read receipts

## Architecture Overview

### System Architecture

```
┌─────────────────────────────────────────────────────────┐
│                     Frontend (React)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   UI Layer   │  │   Services   │  │  WebSocket   │  │
│  │  Components  │  │   API Calls  │  │   Socket.IO  │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
└────────────────────────┬────────────────────┬───────────┘
                         │ HTTP/REST          │ WebSocket
                         │                    │
┌────────────────────────▼────────────────────▼───────────┐
│                  Backend (NestJS)                        │
│  ┌──────────────────────────────────────────────────┐   │
│  │            API Controllers & Guards              │   │
│  └────────────┬──────────────────────┬──────────────┘   │
│               │                      │                   │
│  ┌────────────▼──────┐  ┌───────────▼────────────┐     │
│  │  Business Logic   │  │   WebSocket Gateway    │     │
│  │     Services      │  │     (Socket.IO)        │     │
│  └────────┬──────────┘  └────────────────────────┘     │
│           │                                              │
│  ┌────────▼──────────────────────────────────┐         │
│  │        External Integrations Module       │         │
│  │  ┌──────────┐ ┌────────┐ ┌─────────────┐ │         │
│  │  │   CNPJ   │ │ Credit │ │Notifications│ │         │
│  │  │Providers │ │Analysis│ │  Providers  │ │         │
│  │  └──────────┘ └────────┘ └─────────────┘ │         │
│  └───────────────────────────────────────────┘         │
│                                                          │
│  ┌──────────────────────────────────────────┐          │
│  │         Prisma ORM (Data Layer)          │          │
│  └────────────────┬─────────────────────────┘          │
└───────────────────┼──────────────────────────────────┘
                    │
        ┌───────────▼──────────┐
        │  PostgreSQL Database │
        └──────────────────────┘
```

### Database Schema Highlights

#### Recent Schema Updates (Jan 2026)

1. **Financial Privacy** (Migration: 20260124192836)
   - Added privacy controls for financial data
   - Role-based visibility settings

2. **Supplier Credential System** (Migration: 20260127133914)
   - Complete credentialing workflow tables
   - CNPJ validation history
   - Compliance analysis records
   - Invitation tracking
   - Status history for audit trail

### Key Design Patterns

#### 1. Provider Pattern (Integrations)
Multiple providers for the same service with automatic fallback:
```typescript
try {
  return await primaryProvider.execute();
} catch (error) {
  return await fallbackProvider.execute();
}
```

#### 2. Gateway Pattern (WebSocket)
Centralized WebSocket gateway handling all real-time events:
```typescript
@WebSocketGateway({ namespace: 'chat' })
export class ChatGateway implements OnGatewayConnection
```

#### 3. Service Layer Pattern
Business logic separated from controllers:
```typescript
Controller → Guard → Service → Prisma → Database
```

#### 4. Repository Pattern (via Prisma)
Database access abstracted through Prisma ORM:
```typescript
await this.prisma.supplierCredential.findMany({ where, include })
```

## Development Guidelines

### Code Organization

```
backend/src/
├── modules/              # Feature modules (one per domain)
│   ├── auth/            # Authentication & authorization
│   ├── credentials/     # Supplier credentialing
│   ├── integrations/    # External API integrations
│   └── ...
├── common/              # Shared utilities
│   ├── guards/         # Auth guards, role guards
│   ├── decorators/     # Custom decorators
│   ├── filters/        # Exception filters
│   └── interceptors/   # Request/response interceptors
├── config/             # Configuration modules
└── prisma/             # Prisma service
```

### Best Practices

1. **Always validate input** using class-validator DTOs
2. **Use guards** for authentication and authorization
3. **Implement proper error handling** with custom exceptions
4. **Log all external API calls** for debugging
5. **Use transactions** for multi-step database operations
6. **Write tests** for business logic
7. **Document complex logic** with JSDoc comments
8. **Use soft deletes** for audit trail preservation

### Testing Strategy

```bash
# Unit tests - Services and utilities
npm run test

# Integration tests - API endpoints
npm run test:e2e

# Coverage report
npm run test:cov
```

## API Documentation

### REST API
The REST API follows standard conventions:
- `GET` - Retrieve resources
- `POST` - Create resources
- `PATCH` - Update resources (partial)
- `DELETE` - Remove resources (usually soft delete)

### WebSocket API
Real-time communication uses Socket.IO with these namespaces:
- `/chat` - Order-specific messaging

## Security

### Authentication
- JWT tokens with configurable expiration
- Refresh token support (optional)
- Password hashing with bcrypt

### Authorization
- Role-based access control (RBAC)
- Permission-based guards
- Resource ownership validation

### Data Protection
- Input sanitization
- XSS protection
- SQL injection prevention (via Prisma)
- Rate limiting (recommended for production)
- CORS configuration

## Performance Optimization

### Database
- Proper indexing on frequently queried fields
- Connection pooling
- Query optimization with Prisma
- Pagination for large datasets

### Caching
- Redis caching for validated CNPJs (recommended)
- HTTP response caching
- WebSocket connection pooling

### Monitoring
- Structured logging
- Performance metrics (Prometheus recommended)
- Error tracking (Sentry recommended)
- APM tools (New Relic, DataDog recommended)

## Deployment

### Environment Setup

1. **Development**
   - Local PostgreSQL via Docker
   - Mock external APIs
   - Hot reload enabled

2. **Staging**
   - Managed PostgreSQL (RDS, CloudSQL, etc)
   - Sandbox external APIs
   - SSL/TLS enabled

3. **Production**
   - Managed PostgreSQL with backups
   - Production external APIs
   - SSL/TLS required
   - Load balancing for WebSocket
   - Redis for session/cache
   - CDN for frontend

### Scaling Considerations

#### Horizontal Scaling
- Use Redis adapter for Socket.IO to sync across instances
- Database read replicas for read-heavy operations
- Separate backend instances for API and WebSocket

#### Vertical Scaling
- Increase database resources
- Optimize queries and indexes
- Add caching layers

## Troubleshooting

### Common Issues

1. **Database connection errors**
   - Check DATABASE_URL format
   - Verify PostgreSQL is running
   - Check firewall rules

2. **External API failures**
   - Check provider status pages
   - Verify API keys
   - Review rate limits
   - Check logs for detailed errors

3. **WebSocket connection issues**
   - Verify JWT token validity
   - Check CORS configuration
   - Ensure port accessibility
   - Review gateway logs

4. **Performance issues**
   - Add database indexes
   - Implement caching
   - Optimize queries
   - Review connection pools

## Contributing

When adding new features:

1. Create feature module in `backend/src/modules/`
2. Add comprehensive JSDoc documentation
3. Write unit and integration tests
4. Update Prisma schema if needed
5. Create migration if schema changed
6. Document in `/docs/modules/` if significant
7. Update main README if user-facing

## Support

For technical issues:
1. Check module-specific documentation
2. Review API logs
3. Consult error messages
4. Check external service status pages

## Version History

### January 2026
- ✅ Supplier credentialing system
- ✅ Real-time chat with WebSocket
- ✅ External integrations (CNPJ, Email, WhatsApp)
- ✅ Financial privacy controls

### December 2025
- Multi-user system with granular permissions
- Order review and quality metrics
- Hybrid assignment mode
- Supplier marketplace

---

**Last Updated:** January 27, 2026
