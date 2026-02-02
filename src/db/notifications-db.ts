import Dexie, { Table } from 'dexie';
import { Notification } from '../types/notification.types';

/**
 * IndexedDB for offline notification storage
 * Uses Dexie for a cleaner API
 */
class NotificationsDatabase extends Dexie {
    notifications!: Table<Notification, string>;

    constructor() {
        super('texlink-notifications');

        this.version(1).stores({
            notifications: 'id, recipientId, type, read, createdAt, [recipientId+read], [recipientId+createdAt]',
        });
    }

    /**
     * Store notifications for a user
     */
    async storeNotifications(notifications: Notification[]): Promise<void> {
        await this.notifications.bulkPut(notifications);
    }

    /**
     * Store a single notification
     */
    async storeNotification(notification: Notification): Promise<void> {
        await this.notifications.put(notification);
    }

    /**
     * Get notifications for a user
     */
    async getNotifications(
        recipientId: string,
        options?: { limit?: number; unreadOnly?: boolean }
    ): Promise<Notification[]> {
        let query = this.notifications
            .where('recipientId')
            .equals(recipientId);

        if (options?.unreadOnly) {
            query = this.notifications
                .where('[recipientId+read]')
                .equals([recipientId, 0]);
        }

        let collection = query.reverse().sortBy('createdAt');

        if (options?.limit) {
            return (await collection).slice(0, options.limit);
        }

        return collection;
    }

    /**
     * Get unread count for a user
     */
    async getUnreadCount(recipientId: string): Promise<number> {
        return this.notifications
            .where('[recipientId+read]')
            .equals([recipientId, 0])
            .count();
    }

    /**
     * Mark notification as read
     */
    async markAsRead(notificationId: string): Promise<void> {
        await this.notifications.update(notificationId, {
            read: true,
            readAt: new Date().toISOString(),
        });
    }

    /**
     * Mark multiple notifications as read
     */
    async markManyAsRead(notificationIds: string[]): Promise<void> {
        const now = new Date().toISOString();
        await this.notifications
            .where('id')
            .anyOf(notificationIds)
            .modify({ read: true, readAt: now });
    }

    /**
     * Mark all notifications for a user as read
     */
    async markAllAsRead(recipientId: string): Promise<void> {
        const now = new Date().toISOString();
        await this.notifications
            .where('[recipientId+read]')
            .equals([recipientId, 0])
            .modify({ read: true, readAt: now });
    }

    /**
     * Delete old notifications (older than days)
     */
    async deleteOldNotifications(days: number = 30): Promise<number> {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - days);

        const oldNotifications = await this.notifications
            .where('createdAt')
            .below(cutoff.toISOString())
            .toArray();

        await this.notifications.bulkDelete(oldNotifications.map(n => n.id));

        return oldNotifications.length;
    }

    /**
     * Clear all notifications for a user
     */
    async clearUserNotifications(recipientId: string): Promise<void> {
        await this.notifications.where('recipientId').equals(recipientId).delete();
    }

    /**
     * Check if a notification exists
     */
    async exists(notificationId: string): Promise<boolean> {
        const notification = await this.notifications.get(notificationId);
        return !!notification;
    }
}

// Export singleton instance
export const notificationsDb = new NotificationsDatabase();
export default notificationsDb;
