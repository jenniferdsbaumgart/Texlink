import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { PAYMENT_OVERDUE, PaymentOverdueEvent } from '../events/notification.events';

@Injectable()
export class PaymentOverdueJob {
    private readonly logger = new Logger(PaymentOverdueJob.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Check for overdue payments
     * Runs every 15 minutes
     */
    @Cron('*/15 * * * *', { name: 'payment-overdue-check' })
    async handlePaymentOverdueCheck() {
        this.logger.log('Running payment overdue check job');

        try {
            const now = new Date();

            // Find overdue payments (not paid and past due date)
            const overduePayments = await this.prisma.payment.findMany({
                where: {
                    dueDate: { lt: now },
                    status: { in: ['PENDENTE', 'PARCIAL'] },
                    paidDate: null,
                },
                include: {
                    order: {
                        select: {
                            id: true,
                            displayId: true,
                            brandId: true,
                            supplierId: true,
                        },
                    },
                },
            });

            this.logger.log(`Found ${overduePayments.length} overdue payments`);

            for (const payment of overduePayments) {
                const daysOverdue = Math.ceil(
                    (now.getTime() - payment.dueDate.getTime()) / (24 * 60 * 60 * 1000)
                );

                // Only emit event for payments that crossed a threshold (1, 3, 7, 14, 30 days)
                const thresholds = [1, 3, 7, 14, 30];
                if (!thresholds.includes(daysOverdue)) {
                    continue;
                }

                // Update payment status to ATRASADO
                await this.prisma.payment.update({
                    where: { id: payment.id },
                    data: { status: 'ATRASADO' },
                });

                if (!payment.order.supplierId) continue;

                const event: PaymentOverdueEvent = {
                    paymentId: payment.id,
                    orderId: payment.order.id,
                    orderDisplayId: payment.order.displayId,
                    brandId: payment.order.brandId,
                    supplierId: payment.order.supplierId,
                    amount: payment.amount.toNumber(),
                    dueDate: payment.dueDate,
                    daysOverdue,
                };

                this.eventEmitter.emit(PAYMENT_OVERDUE, event);
            }
        } catch (error) {
            this.logger.error(`Error in payment overdue job: ${error.message}`);
        }
    }
}
