import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../../../prisma/prisma.service';
import { ContractStatus } from '@prisma/client';
import {
  CONTRACT_EXPIRING,
  CONTRACT_EXPIRED,
  ContractExpiringEvent,
  ContractExpiredEvent,
} from '../events/notification.events';

@Injectable()
export class ContractExpirationJob {
  private readonly logger = new Logger(ContractExpirationJob.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Check for expiring contracts
   * Runs daily at 8:00 AM
   */
  @Cron('0 8 * * *', { name: 'contract-expiration-check' })
  async handleContractExpirationCheck() {
    this.logger.log('Running contract expiration check job');

    try {
      const now = new Date();

      // Check for contracts expiring in 30, 14, 7, and 1 days
      const expirationWindows = [30, 14, 7, 1];

      for (const days of expirationWindows) {
        const targetDate = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        const windowStart = new Date(targetDate);
        windowStart.setHours(0, 0, 0, 0);
        const windowEnd = new Date(targetDate);
        windowEnd.setHours(23, 59, 59, 999);

        const expiringContracts = await this.prisma.supplierContract.findMany({
          where: {
            status: ContractStatus.SIGNED,
            validUntil: {
              gte: windowStart,
              lte: windowEnd,
            },
          },
          include: {
            brand: { select: { tradeName: true, legalName: true } },
            supplier: { select: { tradeName: true, legalName: true } },
          },
        });

        this.logger.log(
          `Found ${expiringContracts.length} contracts expiring in ${days} days`,
        );

        for (const contract of expiringContracts) {
          const event: ContractExpiringEvent = {
            contractId: contract.id,
            displayId: contract.displayId,
            brandId: contract.brandId!,
            brandName:
              contract.brand?.tradeName || contract.brand?.legalName || '',
            supplierId: contract.supplierId!,
            supplierName:
              contract.supplier?.tradeName || contract.supplier?.legalName || '',
            title: contract.title || undefined,
            validUntil: contract.validUntil!,
            daysRemaining: days,
          };

          this.eventEmitter.emit(CONTRACT_EXPIRING, event);
        }
      }

      // Also check and mark expired contracts
      await this.handleExpiredContracts();
    } catch (error) {
      this.logger.error(
        `Error in contract expiration check job: ${error.message}`,
      );
    }
  }

  /**
   * Check for contracts that have expired and mark them
   * Runs daily at midnight
   */
  @Cron('0 0 * * *', { name: 'expired-contracts-mark' })
  async handleExpiredContracts() {
    this.logger.log('Checking for expired contracts');

    try {
      const now = new Date();

      // Find contracts that should be expired
      const expiredContracts = await this.prisma.supplierContract.findMany({
        where: {
          status: ContractStatus.SIGNED,
          validUntil: { lt: now },
        },
        include: {
          brand: { select: { tradeName: true, legalName: true } },
          supplier: { select: { tradeName: true, legalName: true } },
        },
      });

      this.logger.log(`Found ${expiredContracts.length} contracts to expire`);

      for (const contract of expiredContracts) {
        // Update status to EXPIRED
        await this.prisma.supplierContract.update({
          where: { id: contract.id },
          data: { status: ContractStatus.EXPIRED },
        });

        const event: ContractExpiredEvent = {
          contractId: contract.id,
          displayId: contract.displayId,
          brandId: contract.brandId!,
          brandName:
            contract.brand?.tradeName || contract.brand?.legalName || '',
          supplierId: contract.supplierId!,
          supplierName:
            contract.supplier?.tradeName || contract.supplier?.legalName || '',
          title: contract.title || undefined,
          expiredAt: contract.validUntil!,
        };

        this.eventEmitter.emit(CONTRACT_EXPIRED, event);

        this.logger.log(
          `Marked contract ${contract.displayId} as expired`,
        );
      }
    } catch (error) {
      this.logger.error(`Error marking expired contracts: ${error.message}`);
    }
  }
}
