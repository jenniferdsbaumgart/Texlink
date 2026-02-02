import api from './api';
import { Notification, NotificationListResponse, NotificationType } from '../types/notification.types';

export interface GetNotificationsParams {
    limit?: number;
    cursor?: string;
    unreadOnly?: boolean;
    type?: NotificationType;
}

export interface MarkReadParams {
    notificationId?: string;
    notificationIds?: string[];
    markAll?: boolean;
}

export interface MarkReadResponse {
    updatedCount: number;
    unreadCount: number;
}

class NotificationsService {
    private readonly basePath = '/notifications';

    /**
     * Get notifications for the current user
     */
    async getNotifications(params?: GetNotificationsParams): Promise<NotificationListResponse> {
        const response = await api.get<NotificationListResponse>(this.basePath, { params });
        return response.data;
    }

    /**
     * Get unread notification count
     */
    async getUnreadCount(): Promise<number> {
        const response = await api.get<{ count: number }>(`${this.basePath}/unread-count`);
        return response.data.count;
    }

    /**
     * Get a single notification
     */
    async getNotification(id: string): Promise<Notification> {
        const response = await api.get<Notification>(`${this.basePath}/${id}`);
        return response.data;
    }

    /**
     * Mark notification(s) as read
     */
    async markAsRead(params: MarkReadParams): Promise<MarkReadResponse> {
        const response = await api.patch<MarkReadResponse>(`${this.basePath}/read`, params);
        return response.data;
    }

    /**
     * Mark a single notification as read
     */
    async markOneAsRead(id: string): Promise<MarkReadResponse> {
        const response = await api.patch<MarkReadResponse>(`${this.basePath}/${id}/read`);
        return response.data;
    }

    /**
     * Mark all notifications as read
     */
    async markAllAsRead(): Promise<MarkReadResponse> {
        const response = await api.post<MarkReadResponse>(`${this.basePath}/mark-all-read`);
        return response.data;
    }
}

export const notificationsService = new NotificationsService();
export default notificationsService;
