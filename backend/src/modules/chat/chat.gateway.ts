import {
    WebSocketGateway,
    WebSocketServer,
    SubscribeMessage,
    OnGatewayConnection,
    OnGatewayDisconnect,
    ConnectedSocket,
    MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger, UseGuards, UnauthorizedException } from '@nestjs/common';
import { ChatService } from './chat.service';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../../prisma/prisma.service';

interface AuthenticatedSocket extends Socket {
    userId: string;
    userName: string;
}

interface SendMessagePayload {
    orderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: string;
}

interface TypingPayload {
    orderId: string;
    isTyping: boolean;
}

@WebSocketGateway({
    namespace: 'chat',
    cors: {
        origin: '*',
        credentials: true,
    },
})
export class ChatGateway implements OnGatewayConnection, OnGatewayDisconnect {
    @WebSocketServer()
    server: Server;

    private readonly logger = new Logger(ChatGateway.name);
    private readonly userSockets: Map<string, Set<string>> = new Map(); // userId -> Set of socketIds

    constructor(
        private readonly chatService: ChatService,
        private readonly jwtService: JwtService,
        private readonly prisma: PrismaService,
    ) { }

    /**
     * Handle new WebSocket connection
     * Validates JWT token from handshake
     */
    async handleConnection(client: AuthenticatedSocket) {
        try {
            // Extract token from handshake auth or query
            const token =
                client.handshake.auth?.token ||
                client.handshake.query?.token;

            if (!token) {
                this.logger.warn(`Client ${client.id} attempted connection without token`);
                client.disconnect();
                return;
            }

            let userId: string;
            let userName: string;

            // Check for mock token (development mode)
            if ((token as string).startsWith('mock-token-')) {
                // In development mode with mock tokens, use demo user IDs
                const tokenParts = (token as string).split('-');
                const role = tokenParts[2]?.toLowerCase();

                // Map role to demo user ID
                const demoUserIds: Record<string, string> = {
                    'brand': 'demo-brand-001',
                    'supplier': 'demo-supplier-001',
                    'admin': 'demo-admin-001',
                };

                const demoUserId = demoUserIds[role] || 'demo-brand-001';

                // Find the demo user
                const mockUser = await this.prisma.user.findUnique({
                    where: { id: demoUserId },
                    select: { id: true, name: true },
                });

                if (!mockUser) {
                    this.logger.warn(`Demo user not found: ${demoUserId}. Run demo-seed.ts first.`);
                    client.disconnect();
                    return;
                }

                userId = mockUser.id;
                userName = mockUser.name;
                this.logger.log(`Mock token accepted for demo user: ${userName} (${userId})`);
            } else {
                // Verify JWT token
                const payload = this.jwtService.verify(token as string);

                if (!payload.sub) {
                    throw new UnauthorizedException('Invalid token payload');
                }

                // Get user info
                const user = await this.prisma.user.findUnique({
                    where: { id: payload.sub },
                    select: { id: true, name: true },
                });

                if (!user) {
                    this.logger.warn(`User not found for token: ${payload.sub}`);
                    client.disconnect();
                    return;
                }

                userId = user.id;
                userName = user.name;
            }

            // Attach user info to socket
            client.userId = userId;
            client.userName = userName;

            // Track user's sockets
            if (!this.userSockets.has(userId)) {
                this.userSockets.set(userId, new Set());
            }
            this.userSockets.get(userId)!.add(client.id);

            this.logger.log(`Client connected: ${client.id} (User: ${userName})`);

            // Emit connection success
            client.emit('connected', {
                userId: userId,
                userName: userName,
                socketId: client.id,
            });
        } catch (error) {
            this.logger.error(`Connection error: ${error.message}`);
            client.emit('error', { message: 'Authentication failed' });
            client.disconnect();
        }
    }

    /**
     * Handle WebSocket disconnection
     */
    handleDisconnect(client: AuthenticatedSocket) {
        if (client.userId) {
            const userSocketSet = this.userSockets.get(client.userId);
            if (userSocketSet) {
                userSocketSet.delete(client.id);
                if (userSocketSet.size === 0) {
                    this.userSockets.delete(client.userId);
                }
            }
        }
        this.logger.log(`Client disconnected: ${client.id}`);
    }

    /**
     * Join an order's chat room
     */
    @SubscribeMessage('join-order')
    async handleJoinOrder(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string },
    ) {
        try {
            // Guard: Ensure user is authenticated
            if (!client.userId) {
                this.logger.warn(`Unauthenticated client tried to join order: ${data.orderId}`);
                return { success: false, error: 'Not authenticated' };
            }

            // Verify user has access to this order
            await this.chatService.verifyOrderAccess(data.orderId, client.userId);

            const roomName = `order:${data.orderId}`;
            await client.join(roomName);

            this.logger.log(`${client.userName} joined room ${roomName}`);

            // Notify others in the room
            client.to(roomName).emit('user-joined', {
                userId: client.userId,
                userName: client.userName,
            });

            // Get unread count
            const unreadCount = await this.chatService.getUnreadCount(data.orderId, client.userId);

            return {
                success: true,
                room: roomName,
                unreadCount,
            };
        } catch (error) {
            this.logger.error(`Error joining order: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Leave an order's chat room
     */
    @SubscribeMessage('leave-order')
    async handleLeaveOrder(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string },
    ) {
        const roomName = `order:${data.orderId}`;
        await client.leave(roomName);

        this.logger.log(`${client.userName} left room ${roomName}`);

        // Notify others
        client.to(roomName).emit('user-left', {
            userId: client.userId,
            userName: client.userName,
        });

        return { success: true };
    }

    /**
     * Send a message to an order's chat
     */
    @SubscribeMessage('send-message')
    async handleSendMessage(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: SendMessagePayload,
    ) {
        try {
            // Create message via service
            const message = await this.chatService.sendMessage(
                data.orderId,
                client.userId,
                {
                    type: data.type,
                    content: data.content,
                    proposedPrice: data.proposedPrice,
                    proposedQuantity: data.proposedQuantity,
                    proposedDeadline: data.proposedDeadline,
                },
            );

            const roomName = `order:${data.orderId}`;

            // Broadcast to all in room (including sender for confirmation)
            this.server.to(roomName).emit('new-message', message);

            this.logger.log(`Message sent in ${roomName} by ${client.userName}`);

            return { success: true, message };
        } catch (error) {
            this.logger.error(`Error sending message: ${error.message}`);
            return { success: false, error: error.message };
        }
    }

    /**
     * Handle typing indicator
     */
    @SubscribeMessage('typing')
    handleTyping(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: TypingPayload,
    ) {
        const roomName = `order:${data.orderId}`;

        // Broadcast to others in room (not sender)
        client.to(roomName).emit('user-typing', {
            userId: client.userId,
            userName: client.userName,
            isTyping: data.isTyping,
        });

        return { success: true };
    }

    /**
     * Mark messages as read
     */
    @SubscribeMessage('mark-read')
    async handleMarkRead(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string },
    ) {
        try {
            // Mark messages as read (done when fetching messages in service)
            await this.chatService.getMessages(data.orderId, client.userId);

            const roomName = `order:${data.orderId}`;

            // Notify others that messages were read
            client.to(roomName).emit('messages-read', {
                orderId: data.orderId,
                userId: client.userId,
                userName: client.userName,
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Accept a proposal
     */
    @SubscribeMessage('accept-proposal')
    async handleAcceptProposal(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string; messageId: string },
    ) {
        try {
            const result = await this.chatService.acceptProposal(data.messageId, client.userId);

            const roomName = `order:${data.orderId}`;

            // Broadcast proposal update
            this.server.to(roomName).emit('proposal-updated', {
                messageId: data.messageId,
                status: 'ACCEPTED',
                updatedOrder: result,
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Reject a proposal
     */
    @SubscribeMessage('reject-proposal')
    async handleRejectProposal(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string; messageId: string },
    ) {
        try {
            await this.chatService.rejectProposal(data.messageId, client.userId);

            const roomName = `order:${data.orderId}`;

            // Broadcast proposal update
            this.server.to(roomName).emit('proposal-updated', {
                messageId: data.messageId,
                status: 'REJECTED',
            });

            return { success: true };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }

    /**
     * Get chat history (also marks messages as read)
     */
    @SubscribeMessage('get-messages')
    async handleGetMessages(
        @ConnectedSocket() client: AuthenticatedSocket,
        @MessageBody() data: { orderId: string },
    ) {
        try {
            // Guard: Ensure user is authenticated
            if (!client.userId) {
                return { success: false, error: 'Not authenticated', messages: [] };
            }

            const messages = await this.chatService.getMessages(data.orderId, client.userId);
            return { success: true, messages };
        } catch (error) {
            return { success: false, error: error.message, messages: [] };
        }
    }

    /**
     * Helper: Emit to all sockets of a specific user
     */
    emitToUser(userId: string, event: string, data: any) {
        const socketIds = this.userSockets.get(userId);
        if (socketIds) {
            socketIds.forEach((socketId) => {
                this.server.to(socketId).emit(event, data);
            });
        }
    }

    /**
     * Helper: Emit to an order room (called from service)
     */
    emitToOrder(orderId: string, event: string, data: any) {
        this.server.to(`order:${orderId}`).emit(event, data);
    }
}
