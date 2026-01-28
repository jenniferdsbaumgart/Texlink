# Changelog

All notable changes to the Texlink project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

#### Backend
- **Supplier Credentialing System** - Complete supplier onboarding workflow
  - CNPJ validation with Brasil API and ReceitaWS fallback
  - Multi-stage status management (Draft → Validation → Invitation → Onboarding → Active)
  - Compliance analysis and risk scoring
  - Multi-channel invitations (Email, WhatsApp)
  - Complete audit trail with status history
  - Pagination and advanced filtering

- **External Integrations Module** - Centralized integration layer
  - CNPJ validation providers (Brasil API, ReceitaWS)
  - Credit analysis provider (Mock implementation, ready for Serasa/Boa Vista)
  - Email notifications via SendGrid
  - WhatsApp/SMS messaging via Twilio
  - Circuit breaker and retry patterns
  - Provider fallback mechanism

- **Real-time Chat System** - WebSocket-based instant messaging
  - Socket.IO gateway for real-time communication
  - Order-specific chat rooms
  - Message types: Text and Proposal
  - Typing indicators
  - Read receipts
  - Proposal negotiation with accept/reject
  - Multi-device support
  - Authentication via JWT tokens
  - Mock token support for development

- **Financial Privacy Controls** - Enhanced privacy features
  - Role-based visibility settings for financial data
  - Granular permission controls

#### Frontend
- **Chat Interface Component** - Real-time messaging UI
  - WebSocket connection management
  - Message bubbles with sender identification
  - Typing indicators
  - Proposal display and interaction
  - Connection status indicator
  - Auto-scroll to latest messages

- **useChatSocket Hook** - React hook for WebSocket communication
  - Connection lifecycle management
  - Message sending and receiving
  - Typing indicator management
  - Proposal acceptance/rejection
  - Unread message tracking

#### Database
- New tables for supplier credentialing:
  - `SupplierCredential` - Main credentialing records
  - `CredentialValidation` - CNPJ validation history
  - `SupplierCompliance` - Compliance analysis results
  - `CredentialInvitation` - Invitation tracking
  - `CredentialStatusHistory` - Audit trail
  - `SupplierOnboarding` - Onboarding progress
  - `SupplierContract` - Contract management

- Database migrations:
  - `20260124192836_add_financial_privacy` - Financial privacy controls
  - `20260127133914_add_supplier_credential_system` - Complete credentialing schema

#### Documentation
- Comprehensive technical documentation for new modules
- `/docs/README.md` - Main documentation index
- `/docs/modules/supplier-credentials.md` - Supplier credentialing guide
- `/docs/modules/integrations.md` - External integrations documentation
- `/docs/modules/realtime-chat.md` - Real-time chat implementation guide
- Updated main README with new features
- Updated backend README with setup instructions

### Changed

#### Backend
- Enhanced chat module with WebSocket gateway
- Updated chat service with proposal handling
- Extended order service with review and hybrid assignment logic
- Improved error handling and validation across modules

#### Frontend
- Refactored `ChatInterface.tsx` with WebSocket support (major changes ~615 lines)
- Enhanced `MessagesPage.tsx` with real-time updates
- Updated `CreateOrderPage.tsx` with new assignment options
- Improved `OrderDetailsPage.tsx` with review functionality

#### Configuration
- Updated `.env.example` with new environment variables for integrations
- Added Socket.IO dependencies to package.json
- Updated Prisma schema with extensive new models

### Dependencies

#### Backend (New)
- `socket.io` - WebSocket server
- `@nestjs/websockets` - NestJS WebSocket support
- `@nestjs/platform-socket.io` - Socket.IO adapter
- `@nestjs/axios` - HTTP client for external APIs
- `axios` - HTTP client library

#### Frontend (New)
- `socket.io-client` - WebSocket client

## [0.3.0] - 2025-12-XX

### Added
- Order review components and quality metrics
- Hybrid assignment option for orders
- Supplier marketplace functionality
- Order service definitions updates

## [0.2.0] - 2025-12-XX

### Added
- Multi-user system with granular permissions
- Video upload support for brand orders
- Duplicate orders and favorites system
- Demo mode with mock data
- Multi-stage onboarding for suppliers

### Changed
- Updated Kanban scrollbar styling
- Consolidated Kanban and List views in sidebar
- Redesigned Create Order page with premium aesthetic
- Enhanced file upload system with S3-ready architecture

## [0.1.0] - 2025-XX-XX

### Added
- Initial project setup
- Basic order management
- Supplier profiles
- Payment tracking
- Rating system
- Basic chat functionality
- Role-based access control
- Team collaboration features

---

## Version History Summary

### January 2026
- ✅ Supplier credentialing system
- ✅ Real-time chat with WebSocket
- ✅ External integrations (CNPJ, Email, WhatsApp)
- ✅ Financial privacy controls
- ✅ Comprehensive technical documentation

### December 2025
- Multi-user system with granular permissions
- Order review and quality metrics
- Hybrid assignment mode
- Supplier marketplace

### November 2025
- Initial platform launch
- Core order management
- Supplier network
- Basic communication

---

## Upgrade Notes

### Upgrading to Latest (Unreleased)

#### Database Migrations
Run the following migrations:

```bash
cd backend
npx prisma migrate dev
```

This will apply:
- `20260124192836_add_financial_privacy`
- `20260127133914_add_supplier_credential_system`

#### Environment Variables
Add the following to your backend `.env`:

```env
# CNPJ Validation (Optional)
BRASIL_API_BASE_URL=https://brasilapi.com.br/api
RECEITAWS_BASE_URL=https://www.receitaws.com.br/v1
RECEITAWS_API_KEY=

# Email (Optional)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=noreply@texlink.com
SENDGRID_FROM_NAME=Texlink Platform

# WhatsApp/SMS (Optional)
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_WHATSAPP_FROM=
TWILIO_SMS_FROM=
```

#### Dependencies
Update dependencies:

```bash
# Backend
cd backend
npm install

# Frontend
cd ..
npm install
```

#### Breaking Changes
None in this release. All changes are backwards compatible.

---

## Known Issues

### Current Limitations

1. **Credit Analysis** - Currently using mock provider
   - Serasa integration pending
   - Boa Vista integration pending

2. **WebSocket Scaling** - Single instance only
   - Redis adapter needed for horizontal scaling
   - Recommended for production deployments

3. **File Upload in Chat** - Not yet implemented
   - Text and proposals only
   - Image/document sharing planned

4. **Push Notifications** - Not implemented
   - Only in-app notifications
   - Mobile push notifications planned

### Workarounds

- For production with multiple backend instances, implement Redis adapter for Socket.IO
- For credit analysis, use mock provider or integrate with your preferred provider
- For file sharing in chat, use order attachments as interim solution

---

## Future Roadmap

### Q1 2026
- ⏳ Redis caching for CNPJ validations
- 📅 Serasa Experian integration
- 📅 Boa Vista SCPC integration
- 📅 File upload in chat messages
- 📅 Circuit breaker implementation

### Q2 2026
- 📅 Push notifications (mobile)
- 📅 Advanced search and filters
- 📅 Bulk operations
- 📅 Export functionality
- 📅 Enhanced analytics

### Q3 2026
- 📅 Mobile application
- 📅 Advanced reporting
- 📅 Workflow automation
- 📅 AI-powered recommendations

---

**Legend:**
- ✅ Completed
- ⏳ In Progress
- 📅 Planned
