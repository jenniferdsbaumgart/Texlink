import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { NotificationsService } from '../notifications.service';

@Injectable()
export class NotificationCleanupJob {
    private readonly logger = new Logger(NotificationCleanupJob.name);

    constructor(
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Clean up old read notifications
     * Runs every Sunday at 2:00 AM
     */
    @Cron('0 2 * * 0', { name: 'notification-cleanup' })
    async handleNotificationCleanup() {
        this.logger.log('Running notification cleanup job');

        try {
            // Delete notifications older than 90 days that have been read
            const deletedCount = await this.notificationsService.deleteOldNotifications(90);
            this.logger.log(`Cleaned up ${deletedCount} old notifications`);
        } catch (error) {
            this.logger.error(`Error in notification cleanup job: ${error.message}`);
        }
    }
}
