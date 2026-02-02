-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM (
    'ORDER_CREATED',
    'ORDER_ACCEPTED',
    'ORDER_REJECTED',
    'ORDER_STATUS_CHANGED',
    'ORDER_PROPOSAL_RECEIVED',
    'ORDER_PROPOSAL_RESPONDED',
    'ORDER_DEADLINE_APPROACHING',
    'ORDER_FINALIZED',
    'MESSAGE_RECEIVED',
    'MESSAGE_UNREAD_REMINDER',
    'CREDENTIAL_INVITE_SENT',
    'CREDENTIAL_STATUS_CHANGED',
    'CREDENTIAL_COMPLETED',
    'DOCUMENT_EXPIRING',
    'DOCUMENT_EXPIRED',
    'PAYMENT_REGISTERED',
    'PAYMENT_RECEIVED',
    'PAYMENT_OVERDUE',
    'TICKET_CREATED',
    'TICKET_MESSAGE_ADDED',
    'TICKET_STATUS_CHANGED',
    'RELATIONSHIP_REQUESTED',
    'RELATIONSHIP_STATUS_CHANGED',
    'RATING_RECEIVED',
    'SYSTEM_ANNOUNCEMENT'
);

-- CreateEnum
CREATE TYPE "NotificationPriority" AS ENUM ('LOW', 'NORMAL', 'HIGH', 'URGENT');

-- CreateEnum
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('PENDING', 'SENT', 'DELIVERED', 'READ', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "notifications" (
    "id" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "priority" "NotificationPriority" NOT NULL DEFAULT 'NORMAL',
    "recipientId" TEXT NOT NULL,
    "companyId" TEXT,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "data" JSONB,
    "actionUrl" TEXT,
    "entityType" TEXT,
    "entityId" TEXT,
    "websocketStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "websocketSentAt" TIMESTAMP(3),
    "emailStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "emailSentAt" TIMESTAMP(3),
    "whatsappStatus" "NotificationDeliveryStatus" NOT NULL DEFAULT 'PENDING',
    "whatsappSentAt" TIMESTAMP(3),
    "read" BOOLEAN NOT NULL DEFAULT false,
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "notifications_recipientId_read_createdAt_idx" ON "notifications"("recipientId", "read", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_type_createdAt_idx" ON "notifications"("type", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "notifications_entityType_entityId_idx" ON "notifications"("entityType", "entityId");

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_recipientId_fkey" FOREIGN KEY ("recipientId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
