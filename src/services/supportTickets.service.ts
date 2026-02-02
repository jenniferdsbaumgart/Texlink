import api from './api';
import type {
    SupportTicket,
    SupportTicketMessage,
    SupportTicketStats,
    SupportTicketStatus,
    SupportTicketCategory,
    SupportTicketPriority,
} from '../types';

export interface CreateTicketDto {
    title: string;
    description: string;
    category: SupportTicketCategory;
    priority?: SupportTicketPriority;
    attachments?: string[];
}

export interface SendMessageDto {
    content: string;
    attachments?: string[];
    isInternal?: boolean;
}

export interface UpdateTicketDto {
    status?: SupportTicketStatus;
    priority?: SupportTicketPriority;
    assignedToId?: string;
    notes?: string;
}

class SupportTicketsService {
    private readonly basePath = '/support-tickets';

    // ========== SUPPLIER/BRAND ENDPOINTS ==========

    // Get my tickets
    async getMyTickets(
        status?: SupportTicketStatus,
        category?: SupportTicketCategory,
    ): Promise<SupportTicket[]> {
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (category) params.append('category', category);

        const response = await api.get<SupportTicket[]>(
            `${this.basePath}?${params.toString()}`
        );
        return response.data;
    }

    // Get ticket by ID
    async getById(id: string): Promise<SupportTicket> {
        const response = await api.get<SupportTicket>(`${this.basePath}/${id}`);
        return response.data;
    }

    // Create ticket
    async create(dto: CreateTicketDto): Promise<SupportTicket> {
        const response = await api.post<SupportTicket>(this.basePath, dto);
        return response.data;
    }

    // Send message
    async sendMessage(ticketId: string, dto: SendMessageDto): Promise<SupportTicketMessage> {
        const response = await api.post<SupportTicketMessage>(
            `${this.basePath}/${ticketId}/messages`,
            dto
        );
        return response.data;
    }

    // Get messages
    async getMessages(ticketId: string): Promise<SupportTicketMessage[]> {
        const response = await api.get<SupportTicketMessage[]>(
            `${this.basePath}/${ticketId}/messages`
        );
        return response.data;
    }

    // Close ticket
    async closeTicket(id: string): Promise<SupportTicket> {
        const response = await api.patch<SupportTicket>(
            `${this.basePath}/${id}/close`
        );
        return response.data;
    }

    // ========== ADMIN ENDPOINTS ==========

    // Get all tickets (admin)
    async getAllAdmin(filters?: {
        status?: SupportTicketStatus;
        priority?: SupportTicketPriority;
        category?: SupportTicketCategory;
        companyId?: string;
        assignedToId?: string;
    }): Promise<SupportTicket[]> {
        const params = new URLSearchParams();
        if (filters?.status) params.append('status', filters.status);
        if (filters?.priority) params.append('priority', filters.priority);
        if (filters?.category) params.append('category', filters.category);
        if (filters?.companyId) params.append('companyId', filters.companyId);
        if (filters?.assignedToId) params.append('assignedToId', filters.assignedToId);

        const response = await api.get<SupportTicket[]>(
            `${this.basePath}/admin/all?${params.toString()}`
        );
        return response.data;
    }

    // Get stats (admin)
    async getStats(): Promise<SupportTicketStats> {
        const response = await api.get<SupportTicketStats>(
            `${this.basePath}/admin/stats`
        );
        return response.data;
    }

    // Update ticket (admin)
    async updateTicket(id: string, dto: UpdateTicketDto): Promise<SupportTicket> {
        const response = await api.patch<SupportTicket>(
            `${this.basePath}/admin/${id}`,
            dto
        );
        return response.data;
    }

    // Reply as support (admin)
    async replyAsSupport(ticketId: string, dto: SendMessageDto): Promise<SupportTicketMessage> {
        const response = await api.post<SupportTicketMessage>(
            `${this.basePath}/admin/${ticketId}/messages`,
            dto
        );
        return response.data;
    }
}

export const supportTicketsService = new SupportTicketsService();
