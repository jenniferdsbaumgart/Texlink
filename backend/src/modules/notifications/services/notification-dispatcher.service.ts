import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import { NotificationsGateway } from '../notifications.gateway';
import { NotificationType, NotificationPriority } from '../dto/notification.dto';

export interface DispatchNotificationPayload {
    type: NotificationType;
    priority?: NotificationPriority;
    recipientId: string;
    companyId?: string;
    title: string;
    body: string;
    data?: Record<string, any>;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    // Channel overrides
    skipWebsocket?: boolean;
    skipEmail?: boolean;
    skipWhatsapp?: boolean;
    // Email specifics
    emailSubject?: string;
    emailTemplate?: string;
}

/**
 * NotificationDispatcherService
 *
 * Handles the multi-channel dispatch of notifications:
 * 1. Persists notification to database
 * 2. Sends via WebSocket (real-time)
 * 3. Sends via Email (based on preferences)
 * 4. Sends via WhatsApp (based on preferences)
 */
@Injectable()
export class NotificationDispatcherService {
    private readonly logger = new Logger(NotificationDispatcherService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly integrationService: IntegrationService,
        private readonly notificationsGateway: NotificationsGateway,
    ) { }

    /**
     * Dispatch a notification through all channels
     */
    async dispatch(payload: DispatchNotificationPayload): Promise<{
        notificationId: string;
        websocketDelivered: boolean;
        emailSent: boolean;
        whatsappSent: boolean;
    }> {
        // Get user's notification preferences
        const preferences = await this.getUserPreferences(payload.recipientId, payload.companyId);

        // Create notification in database
        const notification = await this.prisma.notification.create({
            data: {
                type: payload.type,
                priority: payload.priority || NotificationPriority.NORMAL,
                recipientId: payload.recipientId,
                companyId: payload.companyId,
                title: payload.title,
                body: payload.body,
                data: payload.data,
                actionUrl: payload.actionUrl,
                entityType: payload.entityType,
                entityId: payload.entityId,
                websocketStatus: 'PENDING',
                emailStatus: this.shouldSendEmail(payload, preferences) ? 'PENDING' : 'SKIPPED',
                whatsappStatus: this.shouldSendWhatsapp(payload, preferences) ? 'PENDING' : 'SKIPPED',
            },
        });

        const result = {
            notificationId: notification.id,
            websocketDelivered: false,
            emailSent: false,
            whatsappSent: false,
        };

        // Send via WebSocket
        if (!payload.skipWebsocket) {
            try {
                result.websocketDelivered = await this.notificationsGateway.sendNotification({
                    id: notification.id,
                    type: notification.type,
                    priority: notification.priority,
                    recipientId: notification.recipientId,
                    companyId: notification.companyId,
                    title: notification.title,
                    body: notification.body,
                    data: notification.data as Record<string, any>,
                    actionUrl: notification.actionUrl,
                    entityType: notification.entityType,
                    entityId: notification.entityId,
                    createdAt: notification.createdAt,
                });
            } catch (error) {
                this.logger.error(`WebSocket dispatch failed: ${error.message}`);
            }
        }

        // Send via Email (async, non-blocking)
        if (this.shouldSendEmail(payload, preferences) && !payload.skipEmail) {
            this.sendEmail(notification.id, payload, preferences).catch((error) => {
                this.logger.error(`Email dispatch failed: ${error.message}`);
            });
        }

        // Send via WhatsApp (async, non-blocking)
        if (this.shouldSendWhatsapp(payload, preferences) && !payload.skipWhatsapp) {
            this.sendWhatsapp(notification.id, payload, preferences).catch((error) => {
                this.logger.error(`WhatsApp dispatch failed: ${error.message}`);
            });
        }

        return result;
    }

    /**
     * Dispatch to multiple recipients
     */
    async dispatchBulk(
        recipientIds: string[],
        payload: Omit<DispatchNotificationPayload, 'recipientId'>,
    ): Promise<{ notificationId: string; recipientId: string }[]> {
        const results: { notificationId: string; recipientId: string }[] = [];

        for (const recipientId of recipientIds) {
            const result = await this.dispatch({
                ...payload,
                recipientId,
            });
            results.push({
                notificationId: result.notificationId,
                recipientId,
            });
        }

        return results;
    }

    // ==================== PRIVATE METHODS ====================

    private async getUserPreferences(
        userId: string,
        companyId?: string,
    ): Promise<{
        emailEnabled: boolean;
        whatsappEnabled: boolean;
        email?: string;
        phone?: string;
        categoryPreferences: Record<string, { email: boolean; whatsapp: boolean }>;
    }> {
        const user = await this.prisma.user.findUnique({
            where: { id: userId },
            select: {
                email: true,
                companyUsers: {
                    where: companyId ? { companyId } : undefined,
                    take: 1,
                    include: {
                        company: {
                            include: {
                                notificationSettings: true,
                            },
                        },
                    },
                },
            },
        });

        if (!user) {
            return {
                emailEnabled: false,
                whatsappEnabled: false,
                categoryPreferences: {},
            };
        }

        const settings = user.companyUsers[0]?.company?.notificationSettings;
        const company = user.companyUsers[0]?.company;

        return {
            emailEnabled: settings?.emailEnabled ?? true,
            whatsappEnabled: settings?.whatsappEnabled ?? false,
            email: user.email,
            phone: company?.phone || undefined,
            categoryPreferences: {
                orders: {
                    email: settings?.newOrdersEmail ?? true,
                    whatsapp: settings?.newOrdersWhatsapp ?? true,
                },
                messages: {
                    email: settings?.messagesEmail ?? true,
                    whatsapp: settings?.messagesWhatsapp ?? false,
                },
                payments: {
                    email: settings?.paymentsEmail ?? true,
                    whatsapp: settings?.paymentsWhatsapp ?? true,
                },
                deadlines: {
                    email: settings?.deadlineReminders ?? true,
                    whatsapp: settings?.deadlineReminders ?? true,
                },
                system: {
                    email: settings?.systemUpdates ?? true,
                    whatsapp: false,
                },
            },
        };
    }

    private shouldSendEmail(
        payload: DispatchNotificationPayload,
        preferences: Awaited<ReturnType<typeof this.getUserPreferences>>,
    ): boolean {
        if (!preferences.emailEnabled || !preferences.email) {
            return false;
        }

        // Check category-specific preferences
        const category = this.getNotificationCategory(payload.type);
        const categoryPref = preferences.categoryPreferences[category];

        return categoryPref?.email ?? true;
    }

    private shouldSendWhatsapp(
        payload: DispatchNotificationPayload,
        preferences: Awaited<ReturnType<typeof this.getUserPreferences>>,
    ): boolean {
        if (!preferences.whatsappEnabled || !preferences.phone) {
            return false;
        }

        // Only send for high-priority or urgent notifications
        if (payload.priority !== NotificationPriority.HIGH && payload.priority !== NotificationPriority.URGENT) {
            // Check if it's a deadline or payment notification
            const urgentTypes: NotificationType[] = [
                NotificationType.ORDER_DEADLINE_APPROACHING,
                NotificationType.PAYMENT_OVERDUE,
                NotificationType.DOCUMENT_EXPIRING,
            ];

            if (!urgentTypes.includes(payload.type)) {
                return false;
            }
        }

        const category = this.getNotificationCategory(payload.type);
        const categoryPref = preferences.categoryPreferences[category];

        return categoryPref?.whatsapp ?? false;
    }

    private getNotificationCategory(type: NotificationType): string {
        if (type.startsWith('ORDER_')) return 'orders';
        if (type.startsWith('MESSAGE_') || type.startsWith('PROPOSAL_')) return 'messages';
        if (type.startsWith('PAYMENT_')) return 'payments';
        if (type.startsWith('DEADLINE_') || type === NotificationType.ORDER_DEADLINE_APPROACHING) return 'deadlines';
        if (type.startsWith('SYSTEM_')) return 'system';
        return 'system';
    }

    private async sendEmail(
        notificationId: string,
        payload: DispatchNotificationPayload,
        preferences: Awaited<ReturnType<typeof this.getUserPreferences>>,
    ): Promise<boolean> {
        if (!preferences.email) return false;

        try {
            const subject = payload.emailSubject || `[Texlink] ${payload.title}`;
            const content = this.generateEmailContent(payload);

            const result = await this.integrationService.sendEmail({
                to: preferences.email,
                subject,
                content,
            });

            // Update notification status
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: {
                    emailStatus: result?.success ? 'SENT' : 'FAILED',
                    emailSentAt: result?.success ? new Date() : undefined,
                },
            });

            return result?.success ?? false;
        } catch (error) {
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { emailStatus: 'FAILED' },
            });
            throw error;
        }
    }

    private async sendWhatsapp(
        notificationId: string,
        payload: DispatchNotificationPayload,
        preferences: Awaited<ReturnType<typeof this.getUserPreferences>>,
    ): Promise<boolean> {
        if (!preferences.phone) return false;

        try {
            const message = `*${payload.title}*\n\n${payload.body}`;

            const result = await this.integrationService.sendWhatsApp({
                to: preferences.phone,
                content: message,
            });

            await this.prisma.notification.update({
                where: { id: notificationId },
                data: {
                    whatsappStatus: result?.success ? 'SENT' : 'FAILED',
                    whatsappSentAt: result?.success ? new Date() : undefined,
                },
            });

            return result?.success ?? false;
        } catch (error) {
            await this.prisma.notification.update({
                where: { id: notificationId },
                data: { whatsappStatus: 'FAILED' },
            });
            throw error;
        }
    }

    private generateEmailContent(payload: DispatchNotificationPayload): string {
        const actionButton = payload.actionUrl
            ? `
        <div style="text-align: center; margin: 30px 0;">
          <a href="${payload.actionUrl}"
             style="background-color: #2563eb; color: white; padding: 14px 28px;
                    text-decoration: none; border-radius: 8px; font-weight: bold;
                    display: inline-block;">
            Ver Detalhes
          </a>
        </div>`
            : '';

        const priorityColor = {
            [NotificationPriority.LOW]: '#6b7280',
            [NotificationPriority.NORMAL]: '#2563eb',
            [NotificationPriority.HIGH]: '#f59e0b',
            [NotificationPriority.URGENT]: '#ef4444',
        }[payload.priority || NotificationPriority.NORMAL];

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${payload.title}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <div style="border-left: 4px solid ${priorityColor}; padding-left: 16px; margin-bottom: 20px;">
      <h2 style="color: #1f2937; margin: 0;">${payload.title}</h2>
    </div>

    <p style="font-size: 16px; color: #4b5563;">${payload.body}</p>

    ${actionButton}

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #9ca3af; font-size: 12px;">
      Esta é uma notificação automática do sistema Texlink.<br>
      Para gerenciar suas preferências de notificação, acesse as configurações da sua conta.
    </p>
  </div>
</body>
</html>`;
    }
}
