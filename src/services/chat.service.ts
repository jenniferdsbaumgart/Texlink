import api from './api';
import { MOCK_MODE, simulateDelay } from './mockMode';
import { MOCK_MESSAGES } from './mockData';

export interface Message {
    id: string;
    orderId: string;
    senderId: string;
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposalData?: {
        originalValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        newValues: {
            pricePerUnit: number;
            quantity: number;
            deliveryDeadline: string;
        };
        status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
    };
    read: boolean;
    createdAt: string;
    sender: {
        id: string;
        name: string;
        role: string;
    };
}

export interface SendMessageDto {
    type: 'TEXT' | 'PROPOSAL';
    content?: string;
    proposedPrice?: number;
    proposedQuantity?: number;
    proposedDeadline?: string;
}

// In-memory chat state for mock mode
const mockChatState: Record<string, Message[]> = {};

const getOrCreateChat = (orderId: string): Message[] => {
    if (!mockChatState[orderId]) {
        // Initialize with mock messages if available
        const mockMsgs = MOCK_MESSAGES[orderId as keyof typeof MOCK_MESSAGES] || [];
        mockChatState[orderId] = mockMsgs.map((m, i) => ({
            id: m.id,
            orderId,
            senderId: m.senderId,
            type: 'TEXT' as const,
            content: m.content,
            read: true,
            createdAt: m.createdAt,
            sender: {
                id: m.senderId,
                name: m.senderName,
                role: m.senderId.includes('brand') ? 'BRAND' : 'SUPPLIER'
            }
        }));
    }
    return mockChatState[orderId];
};

export const chatService = {
    async getMessages(orderId: string): Promise<Message[]> {
        if (MOCK_MODE) {
            await simulateDelay(400);
            return getOrCreateChat(orderId);
        }

        const response = await api.get<Message[]>(`/orders/${orderId}/chat`);
        return response.data;
    },

    async sendMessage(orderId: string, data: SendMessageDto): Promise<Message> {
        if (MOCK_MODE) {
            await simulateDelay(500);
            const storedUser = localStorage.getItem('user');
            const user = storedUser ? JSON.parse(storedUser) : { id: 'demo-user', name: 'Demo User', role: 'BRAND' };

            const newMessage: Message = {
                id: `msg-${Date.now()}`,
                orderId,
                senderId: user.id,
                type: data.type,
                content: data.content,
                read: false,
                createdAt: new Date().toISOString(),
                sender: {
                    id: user.id,
                    name: user.name,
                    role: user.role
                }
            };

            const chat = getOrCreateChat(orderId);
            chat.push(newMessage);
            return newMessage;
        }

        const response = await api.post<Message>(`/orders/${orderId}/chat`, data);
        return response.data;
    },

    async acceptProposal(orderId: string, messageId: string) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log(`[MOCK] Proposal ${messageId} accepted for order ${orderId}`);
            return { success: true };
        }

        const response = await api.patch(`/orders/${orderId}/chat/messages/${messageId}/accept`);
        return response.data;
    },

    async rejectProposal(orderId: string, messageId: string) {
        if (MOCK_MODE) {
            await simulateDelay(600);
            console.log(`[MOCK] Proposal ${messageId} rejected for order ${orderId}`);
            return { success: true };
        }

        const response = await api.patch(`/orders/${orderId}/chat/messages/${messageId}/reject`);
        return response.data;
    },

    async getUnreadCount(orderId: string): Promise<{ unreadCount: number }> {
        if (MOCK_MODE) {
            await simulateDelay(200);
            return { unreadCount: 0 };
        }

        const response = await api.get<{ unreadCount: number }>(`/orders/${orderId}/chat/unread`);
        return response.data;
    },
};
