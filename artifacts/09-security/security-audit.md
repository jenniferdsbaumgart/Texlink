# Security Assessment Report

**Application**: Texlink Facção Manager (B2B Textile Supply Chain Platform)
**Date**: 2026-02-07
**Analyst**: Security Analyst Agent (STRAAS AI Coding Squad)
**Scope**: Full application audit (Backend: NestJS 11 + Prisma 7, Frontend: React 19 + Vite)
**Methodology**: OWASP Top 10 (2021), manual code review, dependency audit

---

## Executive Summary

**Overall Risk Level**: HIGH

The application demonstrates a solid security foundation with commendable practices: global rate limiting via @nestjs/throttler, input validation via class-validator with DTO whitelist enforcement, password hashing with bcrypt, DOMPurify-based HTML sanitization, webhook signature verification, Sentry error tracking, and Helmet security headers.

However, the audit identified **3 Critical**, **5 High**, **6 Medium**, and **5 Low** severity findings. The most serious issues involve a hardcoded fallback JWT secret, SQL injection via string interpolation in raw queries, mock token authentication bypass in WebSocket gateways, and WebSocket CORS set to wildcard origin.

| Severity | Count | Requires Immediate Action |
|----------|-------|---------------------------|
| Critical | 3     | Yes                       |
| High     | 5     | Yes (within 7 days)       |
| Medium   | 6     | Within 2-4 weeks          |
| Low      | 5     | Within 1-3 months         |
| Info     | 4     | Informational             |

---

## Critical Findings

### VULN-001: Hardcoded JWT Secret Fallback

**Severity**: CRITICAL | **OWASP**: A07 | **CVSS**: 9.8

**Location**: `backend/src/modules/auth/auth.module.ts:15`, `backend/src/modules/auth/strategies/jwt.strategy.ts:19`

The JWT module uses `|| 'default-secret'` as a fallback when JWT_SECRET is not set. In any environment where JWT_SECRET is missing, the application silently uses a publicly known string, allowing any attacker to forge valid JWT tokens.

**Remediation**: Remove all `|| 'default-secret'` fallbacks; throw on missing JWT_SECRET in ALL environments.

---

### VULN-002: SQL Injection via String Interpolation in Raw Queries

**Severity**: CRITICAL | **OWASP**: A03 | **CVSS**: 8.6

**Location**: `backend/src/modules/admin/admin.service.ts:290-296`

The `getRevenueHistory` method uses template literal interpolation `${months}` inside a Prisma `$queryRaw` INTERVAL clause. While behind an ADMIN guard, the pattern itself is dangerous.

**Remediation**: Compute interval dates in TypeScript and pass as parameterized Date values.

---

### VULN-003: Mock Token Authentication Bypass in WebSocket Gateways

**Severity**: CRITICAL | **OWASP**: A07 | **CVSS**: 9.1

**Location**: `backend/src/modules/chat/chat.gateway.ts:106-138`, `backend/src/modules/notifications/notifications.gateway.ts:89`

WebSocket gateways accept mock tokens (any string starting with `mock-token-`) WITHOUT verifying NODE_ENV. In production, an attacker can connect with `mock-token-brand` and gain access to chat messages and notifications.

**Remediation**: Guard mock token acceptance with strict NODE_ENV check, or remove entirely from production builds.

---

## High Findings

### VULN-004: WebSocket CORS Set to Wildcard Origin

**Severity**: HIGH | **OWASP**: A01 | **CVSS**: 7.5

**Location**: `backend/src/modules/chat/chat.gateway.ts:44-47`, `backend/src/modules/notifications/notifications.gateway.ts:30-33`

Both WebSocket gateways set CORS to `origin: '*'` with `credentials: true`, allowing any website to establish WebSocket connections.

**Remediation**: Use the same CORS configuration as the main app from ConfigService.

---

### VULN-005: JWT Token Expiration Set to 7 Days (Hardcoded)

**Severity**: HIGH | **OWASP**: A07 | **CVSS**: 6.5

**Location**: `backend/src/modules/auth/auth.module.ts:17`

JWT expiration is hardcoded to 604800 seconds (7 days), overriding the JWT_EXPIRATION env var. No refresh token mechanism exists.

**Remediation**: Reduce to 15-60 minutes; implement refresh tokens with httpOnly cookies.

---

### VULN-006: Bcrypt Cost Factor Too Low (10)

**Severity**: HIGH | **OWASP**: A02 | **CVSS**: 5.9

**Location**: `backend/src/modules/auth/auth.service.ts:39`, `backend/src/modules/team/team.service.ts:227`, `backend/src/modules/settings/settings.service.ts:342`

Password hashing uses bcrypt with cost factor 10, below the recommended minimum of 12.

**Remediation**: Increase bcrypt cost factor to 12.

---

### VULN-007: Weak Password Policy on Registration

**Severity**: HIGH | **OWASP**: A07 | **CVSS**: 5.5

**Location**: `backend/src/modules/auth/dto/register.dto.ts:17` (MinLength 6, no complexity)

Registration only requires 6 characters. The onboarding DTO enforces 8 chars with complexity, but registration does not.

**Remediation**: Enforce minimum 8 characters with same regex as CreatePasswordDto.

---

### VULN-008: No Account Lockout After Failed Login Attempts

**Severity**: HIGH | **OWASP**: A07 | **CVSS**: 5.3

**Location**: `backend/src/modules/auth/auth.service.ts:105-138`

Only IP-based rate limiting (5 req/min). No per-account lockout mechanism.

**Remediation**: Implement account-level lockout after N failed attempts using Redis.

---

## Medium Findings

### VULN-009: Swagger API Exposed in Production

**Location**: `backend/src/main.ts:70-77` | Swagger enabled unconditionally.

**Remediation**: Conditionally enable only in non-production.

### VULN-010: .env.production Committed to Git

**Location**: `.env.production` tracked in git; root .gitignore missing `.env*` pattern.

**Remediation**: Add `.env*` to root .gitignore; remove from tracking.

### VULN-011: enableImplicitConversion in ValidationPipe

**Location**: `backend/src/main.ts:61` | Can cause unexpected type coercion.

**Remediation**: Disable and use explicit @Type() decorators.

### VULN-012: Twilio Webhook Signature Validation Bypassable

**Location**: `backend/src/modules/integrations/webhooks/twilio-webhook.controller.ts:50-54`

Only validates if header present; missing header = no auth.

**Remediation**: Always call validateSignature regardless of header presence.

### VULN-013: Missing RolesGuard on Order Endpoints

**Location**: `backend/src/modules/orders/orders.controller.ts:83-167`

Several endpoints use JwtAuthGuard but not RolesGuard.

**Remediation**: Add @UseGuards(RolesGuard) and @Roles() to all order endpoints.

### VULN-014: Health Check Exposes Internal Details

**Location**: `backend/src/modules/health/health.controller.ts:25-27`

`/api/health/detailed` is public, no auth required.

**Remediation**: Protect with JwtAuthGuard and ADMIN role.

---

## Low Findings

| # | Finding | Location |
|---|---------|----------|
| VULN-015 | JWT stored in localStorage (XSS risk) | `src/services/auth.service.ts` |
| VULN-016 | Registration allows ADMIN role self-assignment | `backend/src/modules/auth/dto/register.dto.ts:24` |
| VULN-017 | File upload MIME type can be spoofed | `backend/src/modules/upload/upload.service.ts:42` |
| VULN-018 | No CSRF protection (low risk with Bearer tokens) | Application-wide |
| VULN-019 | No explicit JSON body size limit | `backend/src/main.ts` |

---

## OWASP Top 10 Compliance Matrix

| # | Category | Status | Findings |
|---|----------|--------|----------|
| A01 | Broken Access Control | PARTIAL | VULN-004, VULN-013, VULN-016 |
| A02 | Cryptographic Failures | PARTIAL | VULN-006 |
| A03 | Injection | FAIL | VULN-002, VULN-011 |
| A04 | Insecure Design | PARTIAL | VULN-017 |
| A05 | Security Misconfiguration | PARTIAL | VULN-009, VULN-010, VULN-014 |
| A06 | Vulnerable Components | PARTIAL | See Dependency Audit |
| A07 | Authentication Failures | FAIL | VULN-001, VULN-003, VULN-005, VULN-007, VULN-008 |
| A08 | Data Integrity Failures | PARTIAL | VULN-012 |
| A09 | Security Logging | PASS | Sentry + structured logging |
| A10 | SSRF | PASS | No user-controlled URLs |

---

## Dependency Audit Results

### Backend

| Package | Severity | Vulnerability |
|---------|----------|--------------|
| lodash | Moderate | Prototype Pollution (GHSA-xxjr-mmjv-4gpg) |
| @isaacs/brace-expansion | High | ReDoS (GHSA-7h2j-956f-4vf2) |
| hono (via @prisma/dev) | High | JWT algorithm confusion |
| diff | Low | DoS in parsePatch |

### Frontend

| Package | Severity | Vulnerability |
|---------|----------|--------------|
| lodash | Moderate | Prototype Pollution |

---

## Prioritized Remediation Plan

### Immediate (0-3 days) - Critical

| # | Finding | Action |
|---|---------|--------|
| 1 | VULN-001 | Remove all default-secret fallbacks; throw on missing JWT_SECRET |
| 2 | VULN-003 | Guard mock token logic with NODE_ENV check |
| 3 | VULN-002 | Refactor raw query INTERVAL to parameterized dates |

### Short-term (1-2 weeks) - High

| # | Finding | Action |
|---|---------|--------|
| 4 | VULN-004 | Configure WebSocket CORS with configured origins |
| 5 | VULN-005 | Reduce JWT expiration; implement refresh tokens |
| 6 | VULN-006 | Increase bcrypt cost factor to 12 |
| 7 | VULN-007 | Enforce strong password policy on all registration DTOs |
| 8 | VULN-008 | Implement per-account login attempt tracking and lockout |

### Medium-term (2-4 weeks) - Medium

| # | Finding | Action |
|---|---------|--------|
| 9 | VULN-009 | Disable Swagger in production |
| 10 | VULN-010 | Remove .env.production from git; update .gitignore |
| 11 | VULN-011 | Evaluate disabling enableImplicitConversion |
| 12 | VULN-012 | Fix Twilio webhook signature validation |
| 13 | VULN-013 | Add RolesGuard to all order endpoints |
| 14 | VULN-014 | Protect detailed health endpoint with auth |

### Long-term (1-3 months) - Low

| # | Finding | Action |
|---|---------|--------|
| 15 | VULN-015 | Migrate to httpOnly cookie token storage |
| 16 | VULN-016 | Restrict registration roles to BRAND/SUPPLIER |
| 17 | VULN-017 | Add file magic byte validation |
| 18 | VULN-018 | Prepare CSRF protection for cookie migration |
| 19 | VULN-019 | Configure explicit body parser size limits |
| 20 | Deps | Set up automated dependency scanning (Dependabot/Snyk) |
