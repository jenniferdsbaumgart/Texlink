import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class DeadlineReminderJob {
  private readonly logger = new Logger(DeadlineReminderJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notificationsService: NotificationsService,
  ) {}

  /**
   * Check for orders with deadline in 48 hours
   * Runs every day at 8:00 AM
   */
  @Cron('0 8 * * *', { name: 'deadline-reminder-48h' })
  async handle48HourReminders() {
    this.logger.log('Running 48h deadline reminder job');

    try {
      const now = new Date();
      const in48Hours = new Date(now.getTime() + 48 * 60 * 60 * 1000);

      // Find orders with deadline in the next 48 hours that are still in progress
      const orders = await this.prisma.order.findMany({
        where: {
          deliveryDeadline: {
            gte: now,
            lte: in48Hours,
          },
          status: {
            in: [
              'ACEITO_PELA_FACCAO',
              'EM_PRODUCAO',
              'EM_PREPARACAO_ENTRADA_FACCAO',
            ],
          },
        },
        select: {
          id: true,
          displayId: true,
          productName: true,
          deliveryDeadline: true,
          brandId: true,
          supplierId: true,
        },
      });

      this.logger.log(`Found ${orders.length} orders with deadline in 48h`);

      for (const order of orders) {
        const hoursRemaining = Math.ceil(
          (order.deliveryDeadline.getTime() - now.getTime()) / (60 * 60 * 1000),
        );

        // Notify brand users
        const brandUsers = await this.prisma.companyUser.findMany({
          where: { companyId: order.brandId },
          select: { userId: true },
        });

        for (const user of brandUsers) {
          await this.notificationsService.notifyDeadlineApproaching(
            user.userId,
            {
              orderId: order.id,
              displayId: order.displayId,
              productName: order.productName,
              deadline: order.deliveryDeadline,
              hoursRemaining,
            },
          );
        }

        // Notify supplier users
        if (order.supplierId) {
          const supplierUsers = await this.prisma.companyUser.findMany({
            where: { companyId: order.supplierId },
            select: { userId: true },
          });

          for (const user of supplierUsers) {
            await this.notificationsService.notifyDeadlineApproaching(
              user.userId,
              {
                orderId: order.id,
                displayId: order.displayId,
                productName: order.productName,
                deadline: order.deliveryDeadline,
                hoursRemaining,
              },
            );
          }
        }
      }
    } catch (error) {
      this.logger.error(`Error in 48h deadline reminder job: ${error.message}`);
    }
  }

  /**
   * Check for orders with deadline in 24 hours
   * Runs every day at 8:00 AM and 6:00 PM
   */
  @Cron('0 8,18 * * *', { name: 'deadline-reminder-24h' })
  async handle24HourReminders() {
    this.logger.log('Running 24h deadline reminder job');

    try {
      const now = new Date();
      const in24Hours = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      const orders = await this.prisma.order.findMany({
        where: {
          deliveryDeadline: {
            gte: now,
            lte: in24Hours,
          },
          status: {
            in: [
              'ACEITO_PELA_FACCAO',
              'EM_PRODUCAO',
              'EM_PREPARACAO_ENTRADA_FACCAO',
            ],
          },
        },
        select: {
          id: true,
          displayId: true,
          productName: true,
          deliveryDeadline: true,
          brandId: true,
          supplierId: true,
        },
      });

      this.logger.log(`Found ${orders.length} orders with deadline in 24h`);

      for (const order of orders) {
        const hoursRemaining = Math.ceil(
          (order.deliveryDeadline.getTime() - now.getTime()) / (60 * 60 * 1000),
        );

        // Get all users from both companies
        const companyIds = [order.brandId, order.supplierId].filter(
          Boolean,
        ) as string[];
        const users = await this.prisma.companyUser.findMany({
          where: { companyId: { in: companyIds } },
          select: { userId: true },
        });

        for (const user of users) {
          await this.notificationsService.notifyDeadlineApproaching(
            user.userId,
            {
              orderId: order.id,
              displayId: order.displayId,
              productName: order.productName,
              deadline: order.deliveryDeadline,
              hoursRemaining,
            },
          );
        }
      }
    } catch (error) {
      this.logger.error(`Error in 24h deadline reminder job: ${error.message}`);
    }
  }
}
