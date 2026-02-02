import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { DOCUMENT_EXPIRING, DOCUMENT_EXPIRED, DocumentExpiringEvent, DocumentExpiredEvent } from '../events/notification.events';

@Injectable()
export class DocumentExpirationJob {
    private readonly logger = new Logger(DocumentExpirationJob.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly eventEmitter: EventEmitter2,
    ) { }

    /**
     * Check for expiring documents
     * Runs every Monday at 9:00 AM
     */
    @Cron('0 9 * * 1', { name: 'document-expiration-check' })
    async handleDocumentExpirationCheck() {
        this.logger.log('Running document expiration check job');

        try {
            const now = new Date();

            // Check for documents expiring in 30, 15, and 7 days
            const expirationWindows = [30, 15, 7];

            for (const days of expirationWindows) {
                const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
                const windowStart = new Date(targetDate);
                windowStart.setHours(0, 0, 0, 0);
                const windowEnd = new Date(targetDate);
                windowEnd.setHours(23, 59, 59, 999);

                const expiringDocs = await this.prisma.supplierDocument.findMany({
                    where: {
                        expiresAt: {
                            gte: windowStart,
                            lte: windowEnd,
                        },
                        status: { not: 'EXPIRED' },
                    },
                    select: {
                        id: true,
                        companyId: true,
                        type: true,
                        fileName: true,
                        expiresAt: true,
                    },
                });

                this.logger.log(`Found ${expiringDocs.length} documents expiring in ${days} days`);

                for (const doc of expiringDocs) {
                    const event: DocumentExpiringEvent = {
                        documentId: doc.id,
                        companyId: doc.companyId,
                        documentType: doc.type,
                        documentName: doc.fileName || doc.type,
                        expiresAt: doc.expiresAt!,
                        daysRemaining: days,
                    };

                    this.eventEmitter.emit(DOCUMENT_EXPIRING, event);

                    // Update status to EXPIRING_SOON if within 30 days
                    if (days <= 30) {
                        await this.prisma.supplierDocument.update({
                            where: { id: doc.id },
                            data: { status: 'EXPIRING_SOON' },
                        });
                    }
                }
            }

            // Check for expired documents
            await this.handleExpiredDocuments();
        } catch (error) {
            this.logger.error(`Error in document expiration job: ${error.message}`);
        }
    }

    /**
     * Check for documents that have expired
     * Also runs daily at 9:00 AM
     */
    @Cron('0 9 * * *', { name: 'expired-documents-check' })
    async handleExpiredDocuments() {
        this.logger.log('Checking for expired documents');

        try {
            const now = new Date();

            const expiredDocs = await this.prisma.supplierDocument.findMany({
                where: {
                    expiresAt: { lt: now },
                    status: { not: 'EXPIRED' },
                },
                select: {
                    id: true,
                    companyId: true,
                    type: true,
                    fileName: true,
                    expiresAt: true,
                },
            });

            this.logger.log(`Found ${expiredDocs.length} expired documents`);

            for (const doc of expiredDocs) {
                // Update status to EXPIRED
                await this.prisma.supplierDocument.update({
                    where: { id: doc.id },
                    data: { status: 'EXPIRED' },
                });

                const event: DocumentExpiredEvent = {
                    documentId: doc.id,
                    companyId: doc.companyId,
                    documentType: doc.type,
                    documentName: doc.fileName || doc.type,
                    expiredAt: doc.expiresAt!,
                };

                this.eventEmitter.emit(DOCUMENT_EXPIRED, event);
            }
        } catch (error) {
            this.logger.error(`Error checking expired documents: ${error.message}`);
        }
    }
}
