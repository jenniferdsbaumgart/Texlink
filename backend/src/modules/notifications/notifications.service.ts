import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { IntegrationService } from '../integrations/services/integration.service';

export interface NotificationPayload {
    to: string; // Email ou telefone
    subject?: string; // Para emails
    templateId?: string;
    variables?: Record<string, string>;
}

export interface CredentialNotificationData {
    brandName: string;
    supplierName: string;
    contactName: string;
    contactEmail: string;
    status: string;
    cnpj: string;
}

/**
 * Serviço básico de notificações para credenciamento
 *
 * Envia notificações via email para:
 * - Marca: quando validação/compliance completa
 * - Marca: quando facção inicia onboarding
 * - Facção: quando recebe convite
 *
 * Fase 1: Implementação básica com SendGrid
 * Fase 2+: Adicionar templates customizáveis, histórico, preferências, etc.
 */
@Injectable()
export class NotificationsService {
    private readonly logger = new Logger(NotificationsService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly integrationService: IntegrationService,
    ) { }

    // ==================== MARCA NOTIFICATIONS ====================

    /**
     * Notifica marca quando validação de CNPJ completa
     */
    async notifyBrandValidationComplete(
        credentialId: string,
        validationSuccess: boolean,
    ) {
        try {
            const credential = await this.prisma.supplierCredential.findUnique({
                where: { id: credentialId },
                include: {
                    brand: {
                        select: {
                            tradeName: true,
                            email: true,
                        },
                    },
                },
            });

            if (!credential || !credential.brand.email) {
                this.logger.warn(
                    `Não foi possível enviar notificação de validação para credential ${credentialId}`,
                );
                return;
            }

            const subject = validationSuccess
                ? `[Texlink] Validação de CNPJ concluída - ${credential.tradeName || 'Facção'}`
                : `[Texlink] Validação de CNPJ falhou - ${credential.tradeName || 'Facção'}`;

            const content = this.getValidationCompleteEmailContent(
                credential.brand.tradeName || 'Marca',
                credential.tradeName || credential.legalName || 'Facção',
                this.formatCNPJ(credential.cnpj),
                validationSuccess,
            );

            const result = await this.integrationService.sendEmail({
                to: credential.brand.email,
                subject,
                content,
            });

            if (result?.success) {
                this.logger.log(
                    `Notificação de validação enviada para marca ${credential.brandId}`,
                );
            } else {
                this.logger.error(
                    `Falha ao enviar notificação de validação: ${result?.error}`,
                );
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Erro ao enviar notificação de validação: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Notifica marca quando facção inicia onboarding
     */
    async notifyBrandOnboardingStarted(credentialId: string) {
        try {
            const credential = await this.prisma.supplierCredential.findUnique({
                where: { id: credentialId },
                include: {
                    brand: {
                        select: {
                            tradeName: true,
                            email: true,
                        },
                    },
                },
            });

            if (!credential || !credential.brand.email) {
                this.logger.warn(
                    `Não foi possível enviar notificação de onboarding para credential ${credentialId}`,
                );
                return;
            }

            const subject = `[Texlink] ${credential.tradeName || 'Facção'} iniciou o credenciamento`;

            const content = this.getOnboardingStartedEmailContent(
                credential.brand.tradeName || 'Marca',
                credential.tradeName || credential.legalName || 'Facção',
                credential.contactName || '',
            );

            const result = await this.integrationService.sendEmail({
                to: credential.brand.email,
                subject,
                content,
            });

            if (result?.success) {
                this.logger.log(
                    `Notificação de onboarding enviada para marca ${credential.brandId}`,
                );
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Erro ao enviar notificação de onboarding: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    /**
     * Notifica marca quando compliance é aprovado
     */
    async notifyBrandComplianceApproved(credentialId: string) {
        try {
            const credential = await this.prisma.supplierCredential.findUnique({
                where: { id: credentialId },
                include: {
                    brand: {
                        select: {
                            tradeName: true,
                            email: true,
                        },
                    },
                    compliance: true,
                },
            });

            if (!credential || !credential.brand.email) {
                return;
            }

            const subject = `[Texlink] Análise de compliance aprovada - ${credential.tradeName || 'Facção'}`;

            const content = this.getComplianceApprovedEmailContent(
                credential.brand.tradeName || 'Marca',
                credential.tradeName || credential.legalName || 'Facção',
                credential.compliance?.riskLevel || 'MEDIUM',
            );

            const result = await this.integrationService.sendEmail({
                to: credential.brand.email,
                subject,
                content,
            });

            if (result?.success) {
                this.logger.log(
                    `Notificação de compliance enviada para marca ${credential.brandId}`,
                );
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Erro ao enviar notificação de compliance: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    // ==================== FACÇÃO NOTIFICATIONS ====================

    /**
     * Notifica facção quando recebe convite
     * (Enviado via InvitationService, aqui apenas para referência/fallback)
     */
    async notifySupplierInvited(
        credentialId: string,
        invitationLink: string,
    ) {
        try {
            const credential = await this.prisma.supplierCredential.findUnique({
                where: { id: credentialId },
                include: {
                    brand: {
                        select: {
                            tradeName: true,
                        },
                    },
                },
            });

            if (!credential || !credential.contactEmail) {
                return;
            }

            const subject = `[Texlink] Você foi convidado por ${credential.brand.tradeName}`;

            const content = this.getInvitationEmailContent(
                credential.contactName || 'Parceiro',
                credential.brand.tradeName || 'Marca',
                invitationLink,
            );

            const result = await this.integrationService.sendEmail({
                to: credential.contactEmail,
                subject,
                content,
            });

            if (result?.success) {
                this.logger.log(
                    `Notificação de convite enviada para ${credential.contactEmail}`,
                );
            }

            return result;
        } catch (error) {
            this.logger.error(
                `Erro ao enviar notificação de convite: ${error instanceof Error ? error.message : 'Unknown error'}`,
            );
        }
    }

    // ==================== EMAIL TEMPLATES ====================

    private getValidationCompleteEmailContent(
        brandName: string,
        supplierName: string,
        cnpj: string,
        success: boolean,
    ): string {
        const statusColor = success ? '#10b981' : '#ef4444';
        const statusText = success ? 'Aprovada' : 'Reprovada';
        const statusIcon = success ? '✓' : '✗';
        const nextSteps = success
            ? 'A análise de compliance será executada automaticamente.'
            : 'Verifique os dados do CNPJ e tente novamente.';

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Validação de CNPJ</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Olá, ${brandName}!</h2>

    <div style="background-color: ${statusColor}; color: white; padding: 16px; border-radius: 8px; margin: 20px 0;">
      <div style="font-size: 24px; font-weight: bold;">
        ${statusIcon} Validação ${statusText}
      </div>
    </div>

    <p>A validação de CNPJ foi concluída para:</p>

    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <strong>Facção:</strong> ${supplierName}<br>
      <strong>CNPJ:</strong> ${cnpj}<br>
      <strong>Status:</strong> ${statusText}
    </div>

    <p><strong>Próximos passos:</strong></p>
    <p>${nextSteps}</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">
      Esta é uma notificação automática do sistema Texlink.<br>
      Para gerenciar suas notificações, acesse as configurações da sua conta.
    </p>
  </div>
</body>
</html>`;
    }

    private getOnboardingStartedEmailContent(
        brandName: string,
        supplierName: string,
        contactName: string,
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Onboarding Iniciado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Boa notícia, ${brandName}! 🎉</h2>

    <p>A facção <strong>${supplierName}</strong> aceitou seu convite e iniciou o processo de credenciamento.</p>

    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <strong>Facção:</strong> ${supplierName}<br>
      <strong>Contato:</strong> ${contactName}<br>
      <strong>Status:</strong> Onboarding em andamento
    </div>

    <p>Você será notificado quando o processo de credenciamento for concluído.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">
      Esta é uma notificação automática do sistema Texlink.
    </p>
  </div>
</body>
</html>`;
    }

    private getComplianceApprovedEmailContent(
        brandName: string,
        supplierName: string,
        riskLevel: string,
    ): string {
        const riskColors: Record<string, string> = {
            LOW: '#10b981',
            MEDIUM: '#f59e0b',
            HIGH: '#ef4444',
            CRITICAL: '#991b1b',
        };

        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Compliance Aprovado</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Análise de Compliance Concluída</h2>

    <p>Olá, ${brandName}!</p>

    <p>A análise de compliance foi aprovada para <strong>${supplierName}</strong>.</p>

    <div style="background-color: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
      <strong>Facção:</strong> ${supplierName}<br>
      <strong>Nível de Risco:</strong> <span style="color: ${riskColors[riskLevel] || '#666'}; font-weight: bold;">${riskLevel}</span><br>
      <strong>Status:</strong> Pronto para envio de convite
    </div>

    <p><strong>Próximos passos:</strong></p>
    <p>Você já pode enviar o convite de credenciamento para esta facção.</p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">
      Esta é uma notificação automática do sistema Texlink.
    </p>
  </div>
</body>
</html>`;
    }

    private getInvitationEmailContent(
        contactName: string,
        brandName: string,
        invitationLink: string,
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>Convite de Credenciamento</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
  <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
    <h2 style="color: #2563eb;">Olá, ${contactName}! 👋</h2>

    <p>Você foi convidado pela <strong>${brandName}</strong> para se credenciar como fornecedor parceiro na plataforma Texlink.</p>

    <p>Para iniciar seu processo de credenciamento, clique no botão abaixo:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${invitationLink}"
         style="background-color: #2563eb; color: white; padding: 14px 28px;
                text-decoration: none; border-radius: 8px; font-weight: bold;
                display: inline-block;">
        Iniciar Credenciamento
      </a>
    </div>

    <p style="color: #666; font-size: 14px;">
      <strong>Importante:</strong> Este link é válido por 7 dias.
    </p>

    <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">

    <p style="color: #666; font-size: 12px;">
      Se você não esperava este convite ou tem dúvidas, entre em contato conosco.<br>
      Equipe Texlink
    </p>
  </div>
</body>
</html>`;
    }

    // ==================== HELPERS ====================

    private formatCNPJ(cnpj: string): string {
        const clean = cnpj.replace(/\D/g, '');
        if (clean.length !== 14) return cnpj;

        return clean.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }
}
