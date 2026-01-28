import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { SendMessageDto } from './dto';
import { MessageType, ProposalStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';
import { SanitizerService } from '../../common/services/sanitizer.service';

interface GetMessagesOptions {
    limit?: number;
    cursor?: string; // messageId para cursor-based pagination
    direction?: 'before' | 'after';
}

@Injectable()
export class ChatService {
    constructor(
        private prisma: PrismaService,
        private sanitizer: SanitizerService,
    ) { }

    // Get messages for an order with pagination
    async getMessages(
        orderId: string,
        userId: string,
        options: GetMessagesOptions = {}
    ): Promise<{
        messages: any[];
        hasMore: boolean;
        nextCursor: string | null;
    }> {
        // Verify user has access to this order
        await this.verifyOrderAccess(orderId, userId);

        const limit = Math.min(options.limit || 50, 100); // Max 100
        const { cursor, direction = 'before' } = options;

        let where: any = { orderId };

        // Cursor-based pagination
        if (cursor) {
            const referenceMsg = await this.prisma.message.findUnique({
                where: { id: cursor },
                select: { createdAt: true },
            });

            if (referenceMsg) {
                where.createdAt = direction === 'before'
                    ? { lt: referenceMsg.createdAt }
                    : { gt: referenceMsg.createdAt };
            }
        }

        // Buscar limit + 1 para saber se tem mais
        const messages = await this.prisma.message.findMany({
            where,
            take: limit + 1,
            orderBy: { createdAt: direction === 'before' ? 'desc' : 'asc' },
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });

        // Marcar como lidas (apenas as retornadas, não a +1)
        const messageIds = messages.slice(0, limit).map(m => m.id);
        if (messageIds.length > 0) {
            await this.prisma.message.updateMany({
                where: {
                    id: { in: messageIds },
                    senderId: { not: userId },
                    read: false,
                },
                data: { read: true },
            });
        }

        const hasMore = messages.length > limit;
        const returnMessages = messages.slice(0, limit);

        // Se estava em ordem desc (before), reverter para asc
        if (direction === 'before') {
            returnMessages.reverse();
        }

        const nextCursor = hasMore
            ? returnMessages[returnMessages.length - 1].id
            : null;

        return {
            messages: returnMessages,
            hasMore,
            nextCursor,
        };
    }

    // Send a message
    async sendMessage(orderId: string, userId: string, dto: SendMessageDto) {
        await this.verifyOrderAccess(orderId, userId);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });

        if (!order) {
            throw new NotFoundException('Order not found');
        }

        const messageData: any = {
            orderId,
            senderId: userId,
            type: dto.type,
        };

        // Sanitizar conteúdo de texto
        if (dto.content) {
            const sanitized = this.sanitizer.sanitizeText(dto.content);

            if (!sanitized) {
                throw new BadRequestException('Conteúdo inválido');
            }

            messageData.content = sanitized;
        }

        // Validar e sanitizar proposta
        if (dto.type === MessageType.PROPOSAL) {
            const proposedPrice = this.sanitizer.sanitizeNumber(dto.proposedPrice);
            const proposedQuantity = this.sanitizer.sanitizeNumber(dto.proposedQuantity);
            const proposedDeadline = this.sanitizer.sanitizeDate(dto.proposedDeadline);

            if (!proposedPrice || !proposedQuantity || !proposedDeadline) {
                throw new BadRequestException('Dados de proposta inválidos');
            }

            // Validar que valores fazem sentido
            if (proposedPrice <= 0 || proposedQuantity <= 0) {
                throw new BadRequestException('Valores devem ser positivos');
            }

            if (proposedDeadline < new Date()) {
                throw new BadRequestException('Data de entrega não pode ser no passado');
            }

            messageData.proposalData = {
                originalValues: {
                    pricePerUnit: Number(order.pricePerUnit),
                    quantity: order.quantity,
                    deliveryDeadline: order.deliveryDeadline.toISOString(),
                },
                newValues: {
                    pricePerUnit: proposedPrice,
                    quantity: proposedQuantity,
                    deliveryDeadline: proposedDeadline.toISOString(),
                },
                status: 'PENDING',
            };
        }

        return this.prisma.message.create({
            data: messageData,
            include: {
                sender: { select: { id: true, name: true, role: true } },
            },
        });
    }

    // Accept a proposal
    async acceptProposal(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
            include: { order: true },
        });

        if (!message || message.type !== MessageType.PROPOSAL) {
            throw new NotFoundException('Proposal not found');
        }

        await this.verifyOrderAccess(message.orderId, userId);

        const proposalData = message.proposalData as any;

        if (proposalData.status !== ProposalStatus.PENDING) {
            throw new ForbiddenException('Proposal already processed');
        }

        // Use transaction to ensure data consistency
        return this.prisma.$transaction(async (tx) => {
            // 1. Update message status
            await tx.message.update({
                where: { id: messageId },
                data: {
                    proposalData: {
                        ...proposalData,
                        status: ProposalStatus.ACCEPTED,
                        acceptedAt: new Date().toISOString(),
                        acceptedBy: userId,
                    },
                },
            });

            // 2. Update order with new values
            const updatedOrder = await tx.order.update({
                where: { id: message.orderId },
                data: {
                    pricePerUnit: proposalData.newValues.pricePerUnit,
                    quantity: proposalData.newValues.quantity,
                    totalValue: proposalData.newValues.pricePerUnit * proposalData.newValues.quantity,
                    deliveryDeadline: new Date(proposalData.newValues.deliveryDeadline),
                },
            });

            return updatedOrder;
        });
    }

    // Reject a proposal
    async rejectProposal(messageId: string, userId: string) {
        const message = await this.prisma.message.findUnique({
            where: { id: messageId },
        });

        if (!message || message.type !== MessageType.PROPOSAL) {
            throw new NotFoundException('Proposal not found');
        }

        await this.verifyOrderAccess(message.orderId, userId);

        const proposalData = message.proposalData as any;

        return this.prisma.message.update({
            where: { id: messageId },
            data: {
                proposalData: {
                    ...proposalData,
                    status: ProposalStatus.REJECTED,
                },
            },
        });
    }

    // Get unread count
    async getUnreadCount(orderId: string, userId: string) {
        return this.prisma.message.count({
            where: {
                orderId,
                senderId: { not: userId },
                read: false,
            },
        });
    }

    async verifyOrderAccess(orderId: string, userId: string) {
        console.log(`[ChatService] verifyOrderAccess - orderId: ${orderId}, userId: ${userId}`);

        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                brand: { include: { companyUsers: true } },
                supplier: { include: { companyUsers: true } },
            },
        });

        if (!order) {
            console.log(`[ChatService] Order not found: ${orderId}`);
            throw new NotFoundException('Order not found');
        }

        console.log(`[ChatService] Order found - brandId: ${order.brandId}, supplierId: ${order.supplierId}`);
        console.log(`[ChatService] Brand users: ${order.brand.companyUsers.map(cu => cu.userId).join(', ')}`);
        console.log(`[ChatService] Supplier users: ${order.supplier?.companyUsers.map(cu => cu.userId).join(', ') || 'N/A'}`);

        const hasAccess =
            order.brand.companyUsers.some((cu) => cu.userId === userId) ||
            (order.supplier && order.supplier.companyUsers.some((cu) => cu.userId === userId));

        console.log(`[ChatService] Has access: ${hasAccess}`);

        if (!hasAccess) {
            throw new ForbiddenException('You do not have access to this order');
        }
    }
}
