# Deployment Playbook - Texlink Facção Manager

**Version:** 1.0
**Last Updated:** 2026-02-07
**Application:** Texlink Facção Manager (B2B Textile Supply Chain Platform)
**Tech Stack:** NestJS 11 + Prisma 7 (Backend) | React 19 + Vite (Frontend)

---

## Table of Contents

1. [Environment Setup](#environment-setup)
2. [Deployment Methods](#deployment-methods)
3. [Database Management](#database-management)
4. [Monitoring & Health Checks](#monitoring--health-checks)
5. [Security Checklist](#security-checklist)
6. [Rollback Procedures](#rollback-procedures)
7. [CI/CD Pipeline](#cicd-pipeline)
8. [Troubleshooting](#troubleshooting)

---

## Environment Setup

### Infrastructure Requirements

**Minimum System Requirements:**
- **CPU:** 2 vCPU
- **RAM:** 2 GB (4 GB recommended)
- **Storage:** 20 GB SSD
- **Network:** 100 Mbps

**Required Services:**
- **PostgreSQL:** Version 16+ (Alpine image recommended)
- **Redis:** Version 7+ (optional but recommended for production)
- **Node.js:** Version 20 LTS
- **nginx:** For reverse proxy (VPS deployments)

### Environment Variables Checklist

Based on `backend/.env.example`, here are the required and optional variables:

#### Critical (Application will fail without these)

```bash
# Database
DATABASE_URL="postgresql://user:password@host:5432/texlink?schema=public"

# JWT Authentication
JWT_SECRET="<strong-random-32+-char-secret>"  # Use: openssl rand -base64 32
JWT_EXPIRATION="1h"
JWT_REFRESH_EXPIRATION="30d"

# Application
NODE_ENV="production"
PORT=3000  # Railway auto-injects this

# CORS
CORS_ORIGINS="https://app.texlink.com.br,https://admin.texlink.com.br"
```

#### Recommended (Production best practices)

```bash
# Redis (for rate limiting and caching)
REDIS_URL="redis://localhost:6379"
# Or with password: redis://:password@host:6379

# Monitoring
SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
LOG_LEVEL="log"  # Options: error, warn, log, debug, verbose
```

#### Optional (External integrations)

```bash
# Email (SendGrid)
SENDGRID_API_KEY="SG.xxx"
SENDGRID_FROM_EMAIL="noreply@texlink.com.br"
SENDGRID_FROM_NAME="Texlink"
SENDGRID_WEBHOOK_SIGNATURE_VALIDATION="true"
SENDGRID_WEBHOOK_PUBLIC_KEY="<base64-encoded-key>"

# WhatsApp (Twilio)
TWILIO_ACCOUNT_SID="ACxxx"
TWILIO_AUTH_TOKEN="xxx"
TWILIO_WHATSAPP_FROM="whatsapp:+14155238886"
TWILIO_WEBHOOK_SIGNATURE_VALIDATION="true"

# Storage (AWS S3)
STORAGE_TYPE="s3"  # or "local" for development
AWS_REGION="us-east-1"
AWS_ACCESS_KEY_ID="AKIA..."
AWS_SECRET_ACCESS_KEY="xxx"
AWS_S3_BUCKET="texlink-uploads"
CLOUDFRONT_DOMAIN="d1234.cloudfront.net"  # Optional CDN

# Credit Analysis (Serasa or SPC)
CREDIT_PROVIDER="serasa"  # Options: mock, serasa, spc
SERASA_API_URL="https://api.serasaexperian.com.br"
SERASA_CLIENT_ID="xxx"
SERASA_CLIENT_SECRET="xxx"

# Legal Analysis (DataJud CNJ)
DATAJUD_API_KEY="xxx"  # Free API from CNJ

# Restrictions Analysis (Portal da Transparência)
PORTAL_TRANSPARENCIA_API_URL="https://api.portaldatransparencia.gov.br"
PORTAL_TRANSPARENCIA_API_KEY="xxx"

# CNPJ Validation
RECEITAWS_URL="https://receitaws.com.br/v1/cnpj"
RECEITAWS_API_KEY=""  # Optional
```

#### Frontend Environment Variables

Create `.env.production` in the root directory:

```bash
VITE_API_URL="https://api.texlink.com.br"
VITE_MOCK_MODE="false"
VITE_APP_NAME="Texlink"
```

### Environment Variable Validation

**Before deployment, verify:**

```bash
# Check JWT_SECRET is not the default
if [ "$JWT_SECRET" = "jwt_secret_change_in_production" ]; then
  echo "ERROR: JWT_SECRET must be changed from default value"
  exit 1
fi

# Verify JWT_SECRET length
if [ ${#JWT_SECRET} -lt 32 ]; then
  echo "ERROR: JWT_SECRET must be at least 32 characters"
  exit 1
fi

# Verify NODE_ENV
if [ "$NODE_ENV" != "production" ]; then
  echo "WARNING: NODE_ENV should be 'production'"
fi

# Verify CORS_ORIGINS is set
if [ -z "$CORS_ORIGINS" ]; then
  echo "ERROR: CORS_ORIGINS must be set"
  exit 1
fi
```

---

## Deployment Methods

### Method 1: Railway (Recommended)

Railway provides the easiest deployment with automatic SSL, domain management, and service discovery.

#### Prerequisites

1. Railway account with GitHub connected
2. Railway CLI installed: `npm i -g @railway/cli`
3. GitHub repository connected to Railway project

#### Step-by-Step Deployment

**1. Create Railway Project**

```bash
# Login to Railway
railway login

# Create new project
railway init
```

**2. Add PostgreSQL Service**

- Go to Railway Dashboard > Your Project
- Click "+ New" > Database > PostgreSQL
- Note the generated `DATABASE_URL` variable

**3. Add Redis Service (Recommended)**

- Click "+ New" > Database > Redis
- Note the generated `REDIS_URL` variable

**4. Deploy Backend**

```bash
# Link backend directory to Railway service
cd backend
railway link

# Set environment variables
railway variables set NODE_ENV=production
railway variables set JWT_SECRET=$(openssl rand -base64 32)
railway variables set JWT_EXPIRATION=1h
railway variables set JWT_REFRESH_EXPIRATION=30d
railway variables set CORS_ORIGINS=https://your-frontend-domain.railway.app

# Reference Railway-managed services
railway variables set DATABASE_URL='${{Postgres.DATABASE_URL}}'
railway variables set REDIS_URL='${{Redis.REDIS_URL}}'

# Optional: Add external integrations
railway variables set SENDGRID_API_KEY=your_key
railway variables set TWILIO_ACCOUNT_SID=your_sid
# ... add other optional vars

# Deploy
railway up
```

**5. Deploy Frontend**

```bash
# Link frontend directory to Railway service
cd ..
railway link

# Set environment variables
railway variables set VITE_API_URL=https://your-backend-domain.railway.app
railway variables set VITE_MOCK_MODE=false

# Deploy
railway up
```

**6. Configure Custom Domains**

- Backend: Settings > Networking > Generate Domain or add custom domain
- Frontend: Settings > Networking > Generate Domain or add custom domain
- Update `CORS_ORIGINS` in backend to include frontend domain

**7. Verify Deployment**

```bash
# Check backend health
curl https://your-backend.railway.app/api/health

# Expected response:
{"status":"ok"}

# Check detailed health (requires admin auth)
curl -H "Authorization: Bearer <admin-token>" \
  https://your-backend.railway.app/api/health/detailed
```

#### Railway Configuration Files

The project includes:
- `railway.toml` (frontend config)
- `backend/railway.toml` (backend config)

**Frontend railway.toml:**
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
healthcheckPath = "/health"
healthcheckTimeout = 100
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 5
```

**Backend railway.toml:**
```toml
[build]
builder = "dockerfile"
dockerfilePath = "Dockerfile"

[deploy]
startCommand = "./start.sh"
healthcheckPath = "/api/health"
healthcheckTimeout = 600
numReplicas = 1
restartPolicyType = "ON_FAILURE"
restartPolicyMaxRetries = 10
```

### Method 2: Docker Compose (VPS Deployment)

For self-hosted deployments on a VPS (DigitalOcean, AWS EC2, etc.).

#### Prerequisites

1. VPS with Ubuntu 22.04+ or similar
2. Docker and Docker Compose installed
3. Domain name with DNS configured
4. SSL certificate (Let's Encrypt recommended)

#### Step-by-Step Deployment

**1. Server Setup**

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Docker
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# Install Docker Compose
sudo apt install docker-compose -y

# Add user to docker group
sudo usermod -aG docker $USER
newgrp docker

# Install nginx
sudo apt install nginx certbot python3-certbot-nginx -y
```

**2. Clone Repository**

```bash
# Clone the repo
git clone https://github.com/your-org/texlink-facção-manager.git
cd texlink-facção-manager
```

**3. Configure Environment Variables**

Create `.env.prod` in the project root:

```bash
# Database
DB_USER=texlink
DB_PASSWORD=<strong-random-password>
DB_NAME=texlink

# Redis
REDIS_PASSWORD=<strong-random-password>

# JWT
JWT_SECRET=<strong-random-32-char-secret>
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=30d

# CORS
CORS_ORIGINS=https://app.texlink.com.br

# Frontend
VITE_API_URL=https://api.texlink.com.br

# Optional integrations
SENDGRID_API_KEY=
TWILIO_ACCOUNT_SID=
# ... add as needed
```

**4. Deploy with Docker Compose**

```bash
# Build and start services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify services are running
docker-compose -f docker-compose.prod.yml ps

# Check logs
docker-compose -f docker-compose.prod.yml logs -f backend
docker-compose -f docker-compose.prod.yml logs -f frontend
```

**5. Configure nginx Reverse Proxy**

Create `/etc/nginx/sites-available/texlink`:

```nginx
# Backend API
server {
    listen 80;
    server_name api.texlink.com.br;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }
}

# Frontend
server {
    listen 80;
    server_name app.texlink.com.br;

    location / {
        proxy_pass http://localhost:8080;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable the site:

```bash
sudo ln -s /etc/nginx/sites-available/texlink /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

**6. Setup SSL with Let's Encrypt**

```bash
# Obtain SSL certificates
sudo certbot --nginx -d api.texlink.com.br -d app.texlink.com.br

# Verify auto-renewal
sudo certbot renew --dry-run
```

**7. Verify Deployment**

```bash
# Check health endpoint
curl https://api.texlink.com.br/api/health

# Check frontend
curl -I https://app.texlink.com.br
```

### Method 3: Manual Deployment (Advanced)

For deployments without Docker, directly on a VPS.

#### Prerequisites

1. VPS with Node.js 20 LTS
2. PostgreSQL 16+
3. Redis 7+
4. PM2 process manager
5. nginx

#### Step-by-Step Deployment

**1. Install Dependencies**

```bash
# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install PostgreSQL 16
sudo apt install postgresql-16 postgresql-contrib-16

# Install Redis
sudo apt install redis-server

# Install PM2
sudo npm install -g pm2
```

**2. Setup Database**

```bash
# Create database and user
sudo -u postgres psql
CREATE USER texlink WITH PASSWORD 'your_password';
CREATE DATABASE texlink OWNER texlink;
GRANT ALL PRIVILEGES ON DATABASE texlink TO texlink;
\q
```

**3. Clone and Build Backend**

```bash
# Clone repository
git clone https://github.com/your-org/texlink-facção-manager.git
cd texlink-facção-manager/backend

# Install dependencies
npm ci --only=production

# Create .env file
cat > .env << EOF
DATABASE_URL="postgresql://texlink:your_password@localhost:5432/texlink?schema=public"
JWT_SECRET="$(openssl rand -base64 32)"
NODE_ENV=production
# ... add other vars
EOF

# Generate Prisma client
npx prisma generate

# Run migrations
npx prisma db push

# Build application
npm run build
```

**4. Start Backend with PM2**

```bash
# Create PM2 ecosystem file
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'texlink-backend',
    script: 'dist/src/main.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
}
EOF

# Start with PM2
pm2 start ecosystem.config.js

# Save PM2 configuration
pm2 save

# Setup PM2 startup script
pm2 startup
```

**5. Build and Serve Frontend**

```bash
cd ../
npm ci

# Create .env.production
cat > .env.production << EOF
VITE_API_URL=https://api.texlink.com.br
VITE_MOCK_MODE=false
EOF

# Build
npm run build

# Serve with nginx (see nginx config in Method 2)
# Copy dist/ to /var/www/texlink
sudo mkdir -p /var/www/texlink
sudo cp -r dist/* /var/www/texlink/
```

**6. Configure nginx for Frontend**

```nginx
server {
    listen 80;
    server_name app.texlink.com.br;
    root /var/www/texlink;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

---

## Database Management

### Migration Strategy

**Current State (as of 2026-02-07):**
- The project uses `prisma db push` for schema synchronization (see `backend/start.sh`)
- This is suitable for development but NOT recommended for production

**Recommended Production Strategy:**

1. **Development/Staging:**
   - Use `prisma db push` for rapid iteration
   - Test schema changes thoroughly

2. **Production:**
   - Switch to `prisma migrate deploy` for controlled migrations
   - Update `backend/start.sh`:

```bash
#!/bin/sh
set -e

echo "=== TEXLINK Backend Starting ==="
echo "DATABASE_URL is set: ${DATABASE_URL:+yes}"

# PRODUCTION: Use migrate deploy instead of db push
if [ "$NODE_ENV" = "production" ]; then
  echo "Running Prisma migrations (production mode)..."
  npx prisma migrate deploy --schema=./prisma/schema.prisma
else
  echo "Running Prisma db push (development mode)..."
  npx prisma db push --schema=./prisma/schema.prisma
fi

echo "Running database seed..."
npx prisma db seed || echo "Seed completed or skipped"

echo "Starting NestJS application..."
exec node dist/src/main.js
```

### Creating Migrations

**Before deploying schema changes to production:**

```bash
# 1. In development, create a migration
cd backend
npx prisma migrate dev --name add_contract_revision_table

# 2. Test the migration locally
npx prisma migrate reset

# 3. Commit the migration files
git add prisma/migrations/
git commit -m "feat(db): add contract revision table"

# 4. Deploy to staging first
# (Railway will run the migration via start.sh)

# 5. After staging verification, deploy to production
```

### Database Backup Schedule

**Automated Backups (Recommended):**

**Railway:**
- Railway provides automatic daily backups for PostgreSQL
- Configure in Dashboard > Database > Backups

**VPS/Docker Compose:**
- Setup cron job for daily backups:

```bash
# Create backup script
cat > /opt/texlink/backup-db.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/opt/texlink/backups"
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/texlink_$DATE.sql.gz"

mkdir -p $BACKUP_DIR

# Dump database
docker exec texlink-db pg_dump -U texlink texlink | gzip > $BACKUP_FILE

# Keep only last 30 days
find $BACKUP_DIR -name "texlink_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_FILE"
EOF

chmod +x /opt/texlink/backup-db.sh

# Add to crontab (daily at 2 AM)
crontab -e
# Add line:
0 2 * * * /opt/texlink/backup-db.sh >> /var/log/texlink-backup.log 2>&1
```

### Rollback Procedure

**Rolling back a migration:**

```bash
# 1. Identify the migration to rollback
cd backend
npx prisma migrate status

# 2. Mark the migration as rolled back
npx prisma migrate resolve --rolled-back 20260207_add_contract_revision

# 3. Manually revert database changes (if needed)
# Connect to database and run manual SQL to undo changes

# 4. Deploy previous version of code
# (See Rollback Procedures section)
```

**Point-in-Time Recovery (VPS):**

```bash
# Restore from backup
gunzip < /opt/texlink/backups/texlink_20260207_020000.sql.gz | \
  docker exec -i texlink-db psql -U texlink texlink
```

---

## Monitoring & Health Checks

### Health Check Endpoints

The backend provides four health check endpoints:

| Endpoint | Purpose | Auth Required | Use Case |
|----------|---------|---------------|----------|
| `/api/health` | Basic liveness check | No | Load balancers, uptime monitors |
| `/api/health/live` | Kubernetes liveness probe | No | Container orchestration |
| `/api/health/ready` | Readiness probe (checks dependencies) | No | Kubernetes readiness |
| `/api/health/detailed` | Full dependency status | Yes (Admin only) | Operations debugging |

**Example Responses:**

```bash
# Basic health check
curl https://api.texlink.com.br/api/health
# Response: {"status":"ok"}

# Readiness probe
curl https://api.texlink.com.br/api/health/ready
# Response: {"status":"healthy","ready":true}

# Detailed check (requires admin JWT)
curl -H "Authorization: Bearer <admin-token>" \
  https://api.texlink.com.br/api/health/detailed
# Response:
{
  "status": "healthy",
  "timestamp": "2026-02-07T14:30:00.000Z",
  "checks": {
    "database": "ok",
    "redis": "ok"
  }
}
```

### Uptime Monitoring

**Recommended Services:**
1. **UptimeRobot** (Free tier available)
2. **Better Uptime** (Paid, better incident management)
3. **Pingdom** (Enterprise)

**Setup Example (UptimeRobot):**

1. Create monitor for `/api/health`
   - Type: HTTP(s)
   - URL: `https://api.texlink.com.br/api/health`
   - Interval: 5 minutes
   - Expected keyword: `"status":"ok"`

2. Create monitor for frontend
   - Type: HTTP(s)
   - URL: `https://app.texlink.com.br`
   - Interval: 5 minutes
   - Expected status: 200

3. Configure alerts
   - Email notifications
   - Slack webhook (recommended)

### Error Tracking (Sentry)

**Already integrated** in the codebase. To enable:

1. Create Sentry project at https://sentry.io
2. Get DSN from project settings
3. Set environment variable:
   ```bash
   SENTRY_DSN="https://xxx@xxx.ingest.sentry.io/xxx"
   ```

**Sentry automatically captures:**
- Unhandled exceptions
- HTTP errors (4xx, 5xx)
- Database query failures
- Integration errors (Twilio, SendGrid)

### Application Logs

**Railway:**
- View logs in Dashboard > Deployments > Logs
- Filter by service (backend/frontend)
- Supports search and real-time streaming

**Docker Compose:**
```bash
# View backend logs
docker-compose -f docker-compose.prod.yml logs -f backend

# View frontend logs
docker-compose -f docker-compose.prod.yml logs -f frontend

# View all logs
docker-compose -f docker-compose.prod.yml logs -f
```

**PM2 (Manual deployment):**
```bash
# View logs
pm2 logs texlink-backend

# View error logs only
pm2 logs texlink-backend --err

# Save logs to file
pm2 logs texlink-backend > /var/log/texlink-backend.log
```

### Metrics to Monitor

**Application Metrics:**
- Response time (p50, p95, p99)
- Request rate (req/s)
- Error rate (% of 5xx responses)
- Database connection pool usage
- Redis connection status

**Infrastructure Metrics:**
- CPU usage (< 70% sustained)
- Memory usage (< 80%)
- Disk usage (< 80%)
- Network I/O

**Business Metrics:**
- Active users (daily/monthly)
- Order creation rate
- Contract signature rate
- WebSocket connection count

---

## Security Checklist

### Pre-Deployment Security Verification

**All 19 security findings from the 2026-02-07 audit have been resolved.**
Reference: `artifacts/09-security/security-audit.md`

Before deploying to production, verify:

#### Critical Security Items

- [ ] **JWT_SECRET** is set to a strong random value (min 32 characters)
  ```bash
  # Verify:
  echo $JWT_SECRET | wc -c  # Should be >= 32
  # Generate new:
  openssl rand -base64 32
  ```

- [ ] **JWT_SECRET** is NOT the default value `jwt_secret_change_in_production`

- [ ] **NODE_ENV** is set to `production`
  ```bash
  # Verify:
  echo $NODE_ENV  # Should be: production
  ```

- [ ] **CORS_ORIGINS** is set to specific domains (not wildcards)
  ```bash
  # Good:
  CORS_ORIGINS=https://app.texlink.com.br,https://admin.texlink.com.br

  # BAD:
  CORS_ORIGINS=*
  ```

- [ ] **Database credentials** are strong and unique
  - PostgreSQL password: min 16 characters, alphanumeric + special chars
  - Redis password: min 16 characters

- [ ] **Webhook signature validation** is enabled
  ```bash
  SENDGRID_WEBHOOK_SIGNATURE_VALIDATION=true
  TWILIO_WEBHOOK_SIGNATURE_VALIDATION=true
  ```

#### HTTPS/SSL

- [ ] Application is served over **HTTPS only**
- [ ] SSL certificate is valid and not self-signed
- [ ] HTTP requests redirect to HTTPS
- [ ] HSTS header is enabled (if using nginx)

#### Configuration

- [ ] Swagger API docs are **disabled in production** (automatically disabled in code)
- [ ] `.env` files are **not committed to git** (.gitignore configured)
- [ ] Sentry DSN is configured for error tracking
- [ ] Log level is set appropriately (`log` or `warn` for production)

#### Authentication & Authorization

- [ ] Password policy enforced: 8+ chars, uppercase, lowercase, digit
- [ ] Bcrypt cost factor is 12 (not 10)
- [ ] Account lockout after 5 failed login attempts (15-minute lockout)
- [ ] JWT expiration is reasonable (1h for access token, 30d for refresh)
- [ ] Admin endpoints require `@Roles(UserRole.ADMIN)` guard

#### File Upload

- [ ] File upload uses magic byte validation (not just MIME type check)
- [ ] Max file size is enforced (1MB for JSON bodies)
- [ ] Storage type is configured (`s3` for production, not `local`)

#### Database

- [ ] Database uses parameterized queries only (no string interpolation)
- [ ] Database user has minimal required permissions (not superuser)
- [ ] Database backups are configured and tested

#### WebSocket

- [ ] WebSocket CORS matches main app CORS (not wildcard)
- [ ] Mock token authentication is **disabled in production** (NODE_ENV check)

### Security Testing

**Run before each production deployment:**

```bash
# 1. Dependency audit
cd backend
npm audit --audit-level=high

cd ..
npm audit --audit-level=high

# 2. Check for secrets in code
# (Use gitleaks or similar tool)
docker run -v $(pwd):/path zricethezav/gitleaks:latest detect --source="/path" -v

# 3. Verify environment variables
node -e "
const required = ['DATABASE_URL', 'JWT_SECRET', 'NODE_ENV', 'CORS_ORIGINS'];
const missing = required.filter(v => !process.env[v]);
if (missing.length) {
  console.error('Missing required env vars:', missing);
  process.exit(1);
}
console.log('All required env vars are set');
"

# 4. Test health endpoints
curl -f https://api.texlink.com.br/api/health || echo "Health check failed"
```

### Post-Deployment Security

- [ ] Monitor Sentry for unusual error patterns
- [ ] Check logs for failed authentication attempts
- [ ] Review access logs for suspicious IPs
- [ ] Verify backup restoration works

---

## Rollback Procedures

### When to Rollback

Initiate rollback if:
- Critical functionality is broken
- Database corruption detected
- Security vulnerability introduced
- Error rate exceeds 5% for 5+ minutes
- User-reported critical issues

### Railway Rollback

**Method 1: Redeploy Previous Version**

```bash
# List recent deployments
railway logs

# Find the deployment ID of the last working version
# In Railway Dashboard:
# 1. Go to Deployments tab
# 2. Find last successful deployment
# 3. Click "..." menu > "Redeploy"
```

**Method 2: Git Revert and Redeploy**

```bash
# Revert to previous commit
git revert HEAD
git push origin main

# Railway automatically deploys the revert
```

### Docker Compose Rollback

**1. Stop current deployment**

```bash
cd /path/to/texlink-facção-manager
docker-compose -f docker-compose.prod.yml down
```

**2. Checkout previous version**

```bash
# Find last working commit
git log --oneline -10

# Checkout that commit
git checkout <commit-hash>
```

**3. Rebuild and deploy**

```bash
# Rebuild images
docker-compose -f docker-compose.prod.yml build

# Start services
docker-compose -f docker-compose.prod.yml --env-file .env.prod up -d

# Verify
curl https://api.texlink.com.br/api/health
```

### Database Rollback

**If migration caused issues:**

```bash
# 1. Stop the application
railway service stop  # or docker-compose down

# 2. Restore from backup (see Database Backup section)

# 3. Mark migration as rolled back
cd backend
npx prisma migrate resolve --rolled-back <migration-name>

# 4. Checkout code without the migration
git checkout <previous-commit>

# 5. Restart application
```

**If using Prisma migrate deploy:**

```bash
# Migrations cannot be automatically rolled back
# Manual intervention required:

# 1. Connect to database
psql $DATABASE_URL

# 2. Manually undo migration changes
# (Write reverse SQL based on migration file)

# 3. Update _prisma_migrations table
DELETE FROM "_prisma_migrations"
WHERE migration_name = '20260207_problematic_migration';
```

### Rollback Checklist

- [ ] Identify root cause of issue
- [ ] Notify team of rollback initiation
- [ ] Stop affected services
- [ ] Restore database backup (if needed)
- [ ] Checkout previous working version
- [ ] Rebuild/redeploy
- [ ] Verify health checks pass
- [ ] Run smoke tests
- [ ] Monitor error rates for 15 minutes
- [ ] Document incident in post-mortem
- [ ] Plan fix for next deployment

### Smoke Tests After Rollback

```bash
# 1. Health check
curl https://api.texlink.com.br/api/health

# 2. Authentication
curl -X POST https://api.texlink.com.br/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@texlink.com.br","password":"Test123"}'

# 3. Frontend loads
curl -I https://app.texlink.com.br

# 4. WebSocket connection
# (Use browser dev tools to verify WS connection)

# 5. Check Sentry for new errors
# (Visit Sentry dashboard)
```

---

## CI/CD Pipeline

### GitHub Actions Workflow

The project uses GitHub Actions for continuous integration and deployment.

**Workflow File:** `.github/workflows/ci.yml`

#### Pipeline Overview

```
┌─────────────────────────────────────────────────────────┐
│                    CI/CD PIPELINE                        │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Trigger: push to main/develop, PR                      │
│                                                          │
│  ┌──────────────┐                                       │
│  │  1. LINT     │  Lint & TypeCheck (frontend/backend)  │
│  └──────┬───────┘                                       │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                       │
│  │  2. BUILD    │  Build frontend & backend             │
│  └──────┬───────┘  Upload artifacts                     │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                       │
│  │  3. TEST     │  Run tests with PostgreSQL service    │
│  └──────┬───────┘  Frontend: unit tests                 │
│         │          Backend: integration tests           │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                       │
│  │  4. SECURITY │  npm audit (non-blocking)             │
│  └──────┬───────┘                                       │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                       │
│  │  5. DOCKER   │  Build Docker images (main only)      │
│  └──────────────┘                                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

#### Jobs Breakdown

**1. Lint & Type Check**
- Runs on: All branches
- Tools: ESLint, TypeScript compiler
- Status: **Non-blocking** (uses `|| true`) due to pre-existing warnings
- Purpose: Code quality checks

**2. Build Frontend**
- Runs on: All branches
- Needs: lint
- Steps:
  - Install dependencies with `npm ci`
  - Build with Vite
  - Upload `dist/` as artifact (7-day retention)

**3. Build Backend**
- Runs on: All branches
- Needs: lint
- Steps:
  - Install dependencies with `npm ci`
  - Generate Prisma client
  - Build with NestJS
  - Upload `dist/` as artifact (7-day retention)

**4. Test Backend**
- Runs on: All branches
- Needs: build-backend
- Services: PostgreSQL 16 (test database)
- Steps:
  - Install dependencies
  - Generate Prisma client
  - Run migrations with `prisma migrate deploy`
  - Run tests with `npm test`
- Status: **Non-blocking** (uses `|| true`) - tests are still being written

**5. Test Frontend**
- Runs on: All branches
- Needs: build-frontend
- Steps:
  - Install dependencies
  - Run tests with `npm test` (mock mode)
- Status: **Non-blocking** (uses `|| true`)

**6. Security Audit**
- Runs on: All branches
- Steps:
  - Run `npm audit --audit-level=high` for frontend and backend
- Status: **Non-blocking** but results are visible
- Purpose: Identify known vulnerabilities in dependencies

**7. Build Docker Images**
- Runs on: `main` branch only
- Needs: test-backend, test-frontend
- Steps:
  - Build frontend Docker image (multi-stage)
  - Build backend Docker image (multi-stage)
  - Uses GitHub Actions cache for faster builds
- Status: **Blocking** (must succeed for deployment)
- Note: Images are not pushed (Railway builds from Dockerfile)

#### Deployment Triggers

**Staging Deployment:**
- Trigger: Push to `develop` branch (TO BE IMPLEMENTED)
- Target: Railway staging environment
- Automatic: Yes

**Production Deployment:**
- Trigger: Manual via Railway dashboard or release tags
- Target: Railway production environment
- Automatic: No (requires human approval)

#### Environment Variables for CI

Set in GitHub repository settings > Secrets and variables > Actions:

```
# No secrets required for current CI workflow
# Railway deploys from Dockerfile, no push needed

# Future: if adding deployment automation
RAILWAY_TOKEN=<railway-api-token>
```

### Deployment Workflow (Proposed Enhancement)

**To be added in future iteration:**

```yaml
# .github/workflows/deploy.yml

deploy-staging:
  if: github.ref == 'refs/heads/develop'
  runs-on: ubuntu-latest
  needs: [test-backend, test-frontend]
  steps:
    - name: Deploy to Railway Staging
      run: railway up --service backend-staging

deploy-production:
  if: startsWith(github.ref, 'refs/tags/v')
  runs-on: ubuntu-latest
  needs: [test-backend, test-frontend]
  environment: production  # Requires manual approval
  steps:
    - name: Deploy to Railway Production
      run: railway up --service backend-production
```

---

## Troubleshooting

### Common Issues

#### Issue: Health Check Failing

**Symptoms:**
- `/api/health` returns 503 or times out
- Railway shows "Unhealthy" status

**Diagnosis:**
```bash
# Check application logs
railway logs

# Look for:
# - Database connection errors
# - Redis connection errors
# - Port binding issues
```

**Solutions:**

1. **Database connection failure:**
   ```bash
   # Verify DATABASE_URL is correct
   railway variables get DATABASE_URL

   # Check database service status
   railway status

   # Restart database service if needed
   railway restart --service postgres
   ```

2. **Redis connection failure:**
   ```bash
   # If Redis is optional, app should still work
   # Check if Redis service exists
   railway status

   # If Redis is down, either:
   # - Restart Redis service
   # - Set REDIS_URL to empty (app uses in-memory fallback)
   ```

3. **Port binding issue:**
   ```bash
   # Verify Railway injects PORT env var
   # Backend should listen on process.env.PORT || 3000
   # Check backend/src/main.ts
   ```

#### Issue: Database Migration Fails

**Symptoms:**
- Application crashes on startup
- Logs show "Migration failed"

**Diagnosis:**
```bash
# Check migration status
railway run npx prisma migrate status

# Check for conflicting migrations
railway logs | grep -i "migration"
```

**Solutions:**

1. **Migration conflict:**
   ```bash
   # Resolve conflict by marking as applied
   railway run npx prisma migrate resolve --applied <migration-name>
   ```

2. **Schema mismatch:**
   ```bash
   # If using db push, schema may be out of sync
   # Force reset (DESTRUCTIVE - backup first!)
   railway run npx prisma db push --force-reset
   ```

#### Issue: CORS Error in Frontend

**Symptoms:**
- Browser console shows "CORS policy" error
- API requests fail with 403 or OPTIONS issues

**Diagnosis:**
```bash
# Check CORS_ORIGINS value
railway variables get CORS_ORIGINS

# Verify frontend domain matches
railway domains
```

**Solutions:**

1. **Update CORS_ORIGINS:**
   ```bash
   # Add frontend domain to CORS_ORIGINS
   railway variables set CORS_ORIGINS=https://frontend.railway.app,https://app.texlink.com.br

   # Restart backend
   railway restart
   ```

2. **Verify preflight requests:**
   ```bash
   # Test OPTIONS request
   curl -X OPTIONS https://api.texlink.com.br/api/auth/login \
     -H "Origin: https://app.texlink.com.br" \
     -H "Access-Control-Request-Method: POST" \
     -v

   # Should return Access-Control-Allow-Origin header
   ```

#### Issue: WebSocket Connection Refused

**Symptoms:**
- Chat messages not delivered in real-time
- Notifications not appearing
- Browser shows "WebSocket connection failed"

**Diagnosis:**
```bash
# Check WebSocket CORS configuration
# backend/src/modules/chat/chat.gateway.ts
# backend/src/modules/notifications/notifications.gateway.ts

# Verify frontend URL is in CORS_ORIGINS
railway variables get CORS_ORIGINS
```

**Solutions:**

1. **Update WebSocket CORS:**
   - WebSocket uses same CORS_ORIGINS as main app
   - Ensure frontend domain is included

2. **Check connection URL:**
   ```javascript
   // Frontend should connect to:
   // wss://api.texlink.com.br (not ws://)
   ```

#### Issue: File Upload Fails

**Symptoms:**
- 500 error on file upload
- "Invalid file type" error even for valid files

**Diagnosis:**
```bash
# Check storage configuration
railway variables get STORAGE_TYPE
railway variables get AWS_S3_BUCKET  # if using S3

# Check logs for specific error
railway logs | grep -i "upload"
```

**Solutions:**

1. **S3 credentials invalid:**
   ```bash
   # Verify AWS credentials
   railway variables get AWS_ACCESS_KEY_ID
   railway variables get AWS_SECRET_ACCESS_KEY
   railway variables get AWS_S3_BUCKET

   # Test S3 access manually
   aws s3 ls s3://your-bucket-name
   ```

2. **Magic byte validation failing:**
   - Ensure file is actually the claimed type
   - Some editing tools modify file signatures
   - Check allowed MIME types in `upload.service.ts`

#### Issue: High Memory Usage

**Symptoms:**
- Railway shows high memory usage (>80%)
- Application becomes slow or crashes
- OOM (Out of Memory) errors

**Diagnosis:**
```bash
# Check memory usage
railway status

# Check for memory leaks in logs
railway logs | grep -i "memory"

# Review recent code changes for:
# - Unbounded arrays/objects
# - Missing connection cleanup
# - Large file processing
```

**Solutions:**

1. **Increase Railway plan:**
   - Upgrade to higher memory tier

2. **Optimize code:**
   - Add pagination to list endpoints
   - Cleanup database connections
   - Stream large files instead of loading into memory

3. **Add monitoring:**
   - Setup Sentry to track memory usage over time

### Getting Help

**Before contacting support:**
1. Check application logs
2. Verify environment variables are set correctly
3. Test health endpoints
4. Review recent deployments for breaking changes
5. Search GitHub issues for similar problems

**Support Channels:**
- GitHub Issues: https://github.com/your-org/texlink-facção-manager/issues
- Railway Discord: https://discord.gg/railway (for Railway-specific issues)
- Sentry Issues: Check Sentry dashboard for error patterns

---

## Appendix

### Quick Reference

**Health Check URLs:**
- Basic: `https://api.texlink.com.br/api/health`
- Readiness: `https://api.texlink.com.br/api/health/ready`
- Liveness: `https://api.texlink.com.br/api/health/live`
- Detailed: `https://api.texlink.com.br/api/health/detailed` (admin only)

**Important Files:**
- Backend start script: `backend/start.sh`
- Prisma schema: `backend/prisma/schema.prisma`
- Docker Compose: `docker-compose.prod.yml`
- CI workflow: `.github/workflows/ci.yml`
- Environment example: `backend/.env.example`

**Railway Commands:**
```bash
railway login                    # Login to Railway
railway link                     # Link local directory to Railway service
railway up                       # Deploy current directory
railway logs                     # View logs
railway variables                # List environment variables
railway variables set KEY=value  # Set environment variable
railway status                   # Check service status
railway restart                  # Restart service
```

**Docker Compose Commands:**
```bash
docker-compose -f docker-compose.prod.yml up -d     # Start in background
docker-compose -f docker-compose.prod.yml down      # Stop all services
docker-compose -f docker-compose.prod.yml logs -f   # Follow logs
docker-compose -f docker-compose.prod.yml ps        # List services
docker-compose -f docker-compose.prod.yml restart   # Restart services
```

### Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2026-02-07 | Initial playbook based on TASK-021-DEVOPS |

---

**End of Deployment Playbook**
