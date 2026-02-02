/**
 * Notification System Types
 */

export type NotificationType =
    | 'ORDER_CREATED'
    | 'ORDER_ACCEPTED'
    | 'ORDER_REJECTED'
    | 'ORDER_STATUS_CHANGED'
    | 'ORDER_PROPOSAL_RECEIVED'
    | 'ORDER_PROPOSAL_RESPONDED'
    | 'ORDER_DEADLINE_APPROACHING'
    | 'ORDER_FINALIZED'
    | 'MESSAGE_RECEIVED'
    | 'MESSAGE_UNREAD_REMINDER'
    | 'CREDENTIAL_INVITE_SENT'
    | 'CREDENTIAL_STATUS_CHANGED'
    | 'CREDENTIAL_COMPLETED'
    | 'DOCUMENT_EXPIRING'
    | 'DOCUMENT_EXPIRED'
    | 'PAYMENT_REGISTERED'
    | 'PAYMENT_RECEIVED'
    | 'PAYMENT_OVERDUE'
    | 'TICKET_CREATED'
    | 'TICKET_MESSAGE_ADDED'
    | 'TICKET_STATUS_CHANGED'
    | 'RELATIONSHIP_REQUESTED'
    | 'RELATIONSHIP_STATUS_CHANGED'
    | 'RATING_RECEIVED'
    | 'SYSTEM_ANNOUNCEMENT';

export type NotificationPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'URGENT';

export interface Notification {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    recipientId: string;
    companyId?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    read: boolean;
    readAt?: string;
    createdAt: string;
}

export interface NotificationListResponse {
    notifications: Notification[];
    hasMore: boolean;
    nextCursor?: string;
    unreadCount: number;
}

export interface NotificationContextData {
    notifications: Notification[];
    unreadCount: number;
    isConnected: boolean;
    isLoading: boolean;
    hasMore: boolean;
    fetchNotifications: (cursor?: string) => Promise<void>;
    markAsRead: (notificationId: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    clearNotifications: () => void;
}

export interface WebSocketNotificationPayload {
    id: string;
    type: NotificationType;
    priority: NotificationPriority;
    recipientId: string;
    companyId?: string;
    title: string;
    body: string;
    data?: Record<string, unknown>;
    actionUrl?: string;
    entityType?: string;
    entityId?: string;
    createdAt: string;
}

// Notification icon mapping
export const NOTIFICATION_ICONS: Record<NotificationType, string> = {
    ORDER_CREATED: 'package',
    ORDER_ACCEPTED: 'check-circle',
    ORDER_REJECTED: 'x-circle',
    ORDER_STATUS_CHANGED: 'refresh-cw',
    ORDER_PROPOSAL_RECEIVED: 'file-text',
    ORDER_PROPOSAL_RESPONDED: 'message-circle',
    ORDER_DEADLINE_APPROACHING: 'clock',
    ORDER_FINALIZED: 'check-square',
    MESSAGE_RECEIVED: 'message-square',
    MESSAGE_UNREAD_REMINDER: 'bell',
    CREDENTIAL_INVITE_SENT: 'send',
    CREDENTIAL_STATUS_CHANGED: 'user-check',
    CREDENTIAL_COMPLETED: 'award',
    DOCUMENT_EXPIRING: 'file-warning',
    DOCUMENT_EXPIRED: 'file-x',
    PAYMENT_REGISTERED: 'credit-card',
    PAYMENT_RECEIVED: 'dollar-sign',
    PAYMENT_OVERDUE: 'alert-triangle',
    TICKET_CREATED: 'help-circle',
    TICKET_MESSAGE_ADDED: 'message-circle',
    TICKET_STATUS_CHANGED: 'activity',
    RELATIONSHIP_REQUESTED: 'user-plus',
    RELATIONSHIP_STATUS_CHANGED: 'users',
    RATING_RECEIVED: 'star',
    SYSTEM_ANNOUNCEMENT: 'megaphone',
};

// Notification color mapping
export const NOTIFICATION_COLORS: Record<NotificationPriority, string> = {
    LOW: 'gray',
    NORMAL: 'blue',
    HIGH: 'orange',
    URGENT: 'red',
};

// Helper to get time ago string
export function getTimeAgo(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (seconds < 60) return 'agora';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}min`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
    if (seconds < 604800) return `${Math.floor(seconds / 86400)}d`;
    return date.toLocaleDateString('pt-BR');
}
