import { Process, Processor } from '@nestjs/bull';
import { Logger } from '@nestjs/common';
import type { Job } from 'bull';
import { QUEUE_NAMES, JOB_NAMES } from '../../../config/bull.config';
import { ValidationService } from '../services/validation.service';

export interface CnpjValidationJobData {
  credentialId: string;
  performedById: string;
}

/**
 * Bull processor for async CNPJ validation jobs
 *
 * Processes CNPJ validation requests asynchronously, allowing the API
 * to respond immediately while the validation runs in the background.
 */
@Processor(QUEUE_NAMES.CNPJ_VALIDATION)
export class CnpjValidationProcessor {
  private readonly logger = new Logger(CnpjValidationProcessor.name);

  constructor(private readonly validationService: ValidationService) {}

  /**
   * Process CNPJ validation job
   */
  @Process(JOB_NAMES.VALIDATE_CNPJ)
  async handleValidation(job: Job<CnpjValidationJobData>) {
    const { credentialId, performedById } = job.data;

    this.logger.log(
      `Processing CNPJ validation job for credential ${credentialId}`,
    );

    try {
      const result = await this.validationService.processValidation(
        credentialId,
        performedById,
      );

      const isValid = result.success && result.validation?.isValid;
      this.logger.log(
        `CNPJ validation completed for credential ${credentialId}: ${isValid ? 'VALID' : 'INVALID'}`,
      );

      return result;
    } catch (error) {
      this.logger.error(
        `CNPJ validation failed for credential ${credentialId}: ${error.message}`,
      );
      throw error;
    }
  }
}
