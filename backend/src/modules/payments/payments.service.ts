import { Injectable, NotFoundException, ForbiddenException, Logger } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePaymentDto, UpdatePaymentDto } from './dto';
import { PaymentStatus, CompanyType } from '@prisma/client';
import {
    PAYMENT_REGISTERED,
    PAYMENT_RECEIVED,
    PaymentRegisteredEvent,
    PaymentReceivedEvent,
} from '../notifications/events/notification.events';

@Injectable()
export class PaymentsService {
    private readonly logger = new Logger(PaymentsService.name);

    constructor(
        private prisma: PrismaService,
        private eventEmitter: EventEmitter2,
    ) { }

    // Create payment for an order
    async create(orderId: string, userId: string, dto: CreatePaymentDto) {
        // Verify user has access (brand owner)
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                brand: { include: { companyUsers: true } },
            },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const isBrandUser = order.brand.companyUsers.some((cu) => cu.userId === userId);
        if (!isBrandUser) {
            throw new ForbiddenException('Only brand can create payments');
        }

        const payment = await this.prisma.payment.create({
            data: {
                orderId,
                amount: dto.amount,
                dueDate: new Date(dto.dueDate),
                method: dto.method,
                notes: dto.notes,
                status: PaymentStatus.PENDENTE,
            },
        });

        // Emit payment registered event
        if (order.supplierId) {
            const event: PaymentRegisteredEvent = {
                paymentId: payment.id,
                orderId,
                orderDisplayId: order.displayId,
                brandId: order.brandId,
                supplierId: order.supplierId,
                amount: dto.amount,
                dueDate: new Date(dto.dueDate),
            };
            this.eventEmitter.emit(PAYMENT_REGISTERED, event);
            this.logger.log(`Emitted payment.registered event for order ${order.displayId}`);
        }

        return payment;
    }

    // Update payment status
    async update(paymentId: string, userId: string, dto: UpdatePaymentDto) {
        const payment = await this.prisma.payment.findUnique({
            where: { id: paymentId },
            include: {
                order: {
                    select: {
                        id: true,
                        displayId: true,
                        brandId: true,
                        supplierId: true,
                        brand: { include: { companyUsers: true } },
                    },
                },
            },
        });

        if (!payment) {
            throw new NotFoundException('Payment not found');
        }

        const updatedPayment = await this.prisma.payment.update({
            where: { id: paymentId },
            data: {
                ...(dto.status && { status: dto.status }),
                ...(dto.paidDate && { paidDate: new Date(dto.paidDate) }),
                ...(dto.proofUrl && { proofUrl: dto.proofUrl }),
            },
        });

        // Emit payment received event when status changes to PAGO
        if (dto.status === PaymentStatus.PAGO && payment.order.supplierId) {
            const event: PaymentReceivedEvent = {
                paymentId,
                orderId: payment.orderId,
                orderDisplayId: payment.order.displayId,
                brandId: payment.order.brandId,
                supplierId: payment.order.supplierId,
                amount: Number(payment.amount),
                paidDate: dto.paidDate ? new Date(dto.paidDate) : new Date(),
            };
            this.eventEmitter.emit(PAYMENT_RECEIVED, event);
            this.logger.log(`Emitted payment.received event for order ${payment.order.displayId}`);
        }

        return updatedPayment;
    }

    // Get payments for an order
    async getOrderPayments(orderId: string) {
        return this.prisma.payment.findMany({
            where: { orderId },
            orderBy: { dueDate: 'asc' },
        });
    }

    // Get financial summary for a supplier
    async getSupplierFinancialSummary(userId: string) {
        const companyUser = await this.prisma.companyUser.findFirst({
            where: {
                userId,
                company: { type: CompanyType.SUPPLIER },
            },
        });

        if (!companyUser) {
            throw new NotFoundException('Supplier company not found');
        }

        const [pending, paid, overdue, total] = await Promise.all([
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.PENDENTE,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.PAGO,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                    status: PaymentStatus.ATRASADO,
                },
                _sum: { amount: true },
            }),
            this.prisma.payment.aggregate({
                where: {
                    order: { supplierId: companyUser.companyId },
                },
                _sum: { amount: true },
            }),
        ]);

        // Get recent payments
        const recentPayments = await this.prisma.payment.findMany({
            where: {
                order: { supplierId: companyUser.companyId },
            },
            include: {
                order: {
                    select: { displayId: true, productName: true, brand: { select: { tradeName: true } } },
                },
            },
            orderBy: { updatedAt: 'desc' },
            take: 10,
        });

        return {
            summary: {
                pending: pending._sum.amount || 0,
                paid: paid._sum.amount || 0,
                overdue: overdue._sum.amount || 0,
                total: total._sum.amount || 0,
            },
            recentPayments,
        };
    }
}
