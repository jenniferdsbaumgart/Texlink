import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';
import { SUPPLIER_STATUS_CHANGED } from '../events/notification.events';
import type { SupplierStatusChangedEvent } from '../events/notification.events';
import {
  NotificationType,
  NotificationPriority,
} from '../dto/notification.dto';

@Injectable()
export class SupplierEventsHandler {
  private readonly logger = new Logger(SupplierEventsHandler.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Handle supplier status changed event (approval/rejection)
   * Notify supplier company users about status change
   */
  @OnEvent(SUPPLIER_STATUS_CHANGED)
  async handleSupplierStatusChanged(payload: Record<string, unknown>) {
    const event = payload as unknown as SupplierStatusChangedEvent;
    this.logger.log(
      `Handling supplier.status.changed for company ${event.companyId}: ${event.previousStatus} -> ${event.newStatus}`,
    );

    try {
      // Get all users from the supplier company
      const companyUsers = await this.prisma.companyUser.findMany({
        where: {
          companyId: event.companyId,
          role: { in: ['OWNER', 'MANAGER'] },
        },
        select: { userId: true },
      });

      if (companyUsers.length === 0) {
        this.logger.warn(
          `No users found for company ${event.companyId} to notify`,
        );
        return;
      }

      const isApproved = event.newStatus === 'ACTIVE';
      const title = isApproved
        ? 'Empresa Aprovada'
        : 'Empresa Rejeitada';

      let body = isApproved
        ? `Sua empresa "${event.companyName}" foi aprovada e est\u00e1 ativa na plataforma.`
        : `Sua empresa "${event.companyName}" foi rejeitada.`;

      if (event.reason) {
        body += ` Motivo: ${event.reason}`;
      }

      for (const user of companyUsers) {
        await this.notificationsService.notify({
          type: NotificationType.SUPPLIER_STATUS_CHANGED,
          priority: NotificationPriority.HIGH,
          recipientId: user.userId,
          companyId: event.companyId,
          title,
          body,
          data: event as any,
          actionUrl: '/portal',
          entityType: 'company',
          entityId: event.companyId,
        });
      }

      this.logger.log(
        `Sent ${companyUsers.length} notifications for supplier status change ${event.companyId}`,
      );
    } catch (error) {
      this.logger.error(
        `Error handling supplier.status.changed: ${error.message}`,
      );
    }
  }
}
