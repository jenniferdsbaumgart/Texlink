import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SupplierCredentialStatus } from '@prisma/client';

/**
 * Serviço de Onboarding - Lida com fluxo público de onboarding de facções
 *
 * Funções principais:
 * - Validação de token de convite (público)
 * - Criação de conta de facção
 * - Gerenciamento de progresso do onboarding
 */
@Injectable()
export class OnboardingService {
    private readonly logger = new Logger(OnboardingService.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly notificationsService: NotificationsService,
    ) { }

    /**
     * Valida token de convite público (sem autenticação)
     *
     * Retorna:
     * - Dados da marca (nome, logo)
     * - Dados básicos do convite (CNPJ, nome de contato)
     * - Status do convite (ativo, expirado)
     *
     * @param token - Token único do convite
     */
    async validateToken(token: string) {
        // Busca convite pelo token
        const invitation = await this.prisma.credentialInvitation.findUnique({
            where: { token },
            include: {
                credential: {
                    include: {
                        brand: {
                            select: {
                                id: true,
                                tradeName: true,
                                legalName: true,
                                logoUrl: true,
                                city: true,
                                state: true,
                            },
                        },
                        onboarding: true,
                    },
                },
            },
        });

        if (!invitation) {
            throw new NotFoundException(
                'Token de convite inválido ou não encontrado',
            );
        }

        // Verifica se o convite está ativo
        if (!invitation.isActive) {
            throw new BadRequestException(
                'Este convite não está mais ativo. Um novo convite pode ter sido enviado.',
            );
        }

        // Verifica expiração
        const now = new Date();
        const isExpired = now > invitation.expiresAt;

        if (isExpired) {
            // Marca como expirado
            await this.prisma.credentialInvitation.update({
                where: { id: invitation.id },
                data: { isActive: false },
            });

            // Atualiza status do credential se necessário
            if (
                invitation.credential.status ===
                SupplierCredentialStatus.INVITATION_SENT
            ) {
                await this.prisma.supplierCredential.update({
                    where: { id: invitation.credentialId },
                    data: { status: SupplierCredentialStatus.INVITATION_EXPIRED },
                });

                // Registra no histórico
                await this.prisma.credentialStatusHistory.create({
                    data: {
                        credentialId: invitation.credentialId,
                        fromStatus: SupplierCredentialStatus.INVITATION_SENT,
                        toStatus: SupplierCredentialStatus.INVITATION_EXPIRED,
                        performedById: 'SYSTEM',
                        reason: 'Convite expirado',
                    },
                });
            }

            throw new BadRequestException(
                `Este convite expirou em ${invitation.expiresAt.toLocaleDateString('pt-BR')}. ` +
                `Entre em contato com ${invitation.credential.brand.tradeName} para solicitar um novo convite.`,
            );
        }

        // Atualiza openedAt se primeira vez
        if (!invitation.openedAt) {
            await this.prisma.credentialInvitation.update({
                where: { id: invitation.id },
                data: { openedAt: now },
            });

            // Atualiza status do credential para OPENED
            if (
                invitation.credential.status ===
                SupplierCredentialStatus.INVITATION_SENT
            ) {
                await this.prisma.supplierCredential.update({
                    where: { id: invitation.credentialId },
                    data: { status: SupplierCredentialStatus.INVITATION_OPENED },
                });

                await this.prisma.credentialStatusHistory.create({
                    data: {
                        credentialId: invitation.credentialId,
                        fromStatus: SupplierCredentialStatus.INVITATION_SENT,
                        toStatus: SupplierCredentialStatus.INVITATION_OPENED,
                        performedById: 'SYSTEM',
                        reason: 'Convite aberto pelo destinatário',
                    },
                });
            }

            this.logger.log(
                `Convite ${invitation.id} aberto pela primeira vez`,
            );
        }

        // Calcula dias restantes
        const daysRemaining = Math.ceil(
            (invitation.expiresAt.getTime() - now.getTime()) /
            (1000 * 60 * 60 * 24),
        );

        // Retorna dados públicos
        return {
            valid: true,
            token,
            brand: {
                name: invitation.credential.brand.tradeName || invitation.credential.brand.legalName,
                logo: invitation.credential.brand.logoUrl,
                location: `${invitation.credential.brand.city}, ${invitation.credential.brand.state}`,
            },
            supplier: {
                cnpj: this.formatCNPJ(invitation.credential.cnpj),
                tradeName: invitation.credential.tradeName,
                legalName: invitation.credential.legalName,
                contactName: invitation.credential.contactName,
                contactEmail: invitation.credential.contactEmail,
                contactPhone: invitation.credential.contactPhone,
            },
            invitation: {
                type: invitation.type,
                sentAt: invitation.sentAt,
                expiresAt: invitation.expiresAt,
                daysRemaining,
            },
            status: invitation.credential.status,
            // Verifica se já existe onboarding iniciado
            hasOnboarding: !!invitation.credential.onboarding,
            onboardingProgress: invitation.credential.onboarding
                ? {
                    currentStep: invitation.credential.onboarding.currentStep,
                    totalSteps: invitation.credential.onboarding.totalSteps,
                    completedSteps: invitation.credential.onboarding.completedSteps,
                }
                : null,
        };
    }

    /**
     * Inicia o processo de onboarding
     *
     * Marca o status como ONBOARDING_STARTED e cria registro de progresso
     */
    async startOnboarding(token: string, deviceInfo?: any) {
        // Valida token primeiro
        const validation = await this.validateToken(token);

        const invitation = await this.prisma.credentialInvitation.findUnique({
            where: { token },
        });

        if (!invitation) {
            throw new NotFoundException('Convite não encontrado');
        }

        // Verifica se já existe onboarding
        const existingOnboarding = await this.prisma.supplierOnboarding.findUnique(
            {
                where: { credentialId: invitation.credentialId },
            },
        );

        if (existingOnboarding) {
            // Atualiza última atividade
            await this.prisma.supplierOnboarding.update({
                where: { id: existingOnboarding.id },
                data: {
                    lastActivityAt: new Date(),
                    deviceInfo: deviceInfo as object | undefined,
                },
            });

            this.logger.log(
                `Onboarding retomado: ${existingOnboarding.id}`,
            );

            return {
                onboardingId: existingOnboarding.id,
                resumed: true,
                currentStep: existingOnboarding.currentStep,
            };
        }

        // Cria novo onboarding
        const onboarding = await this.prisma.supplierOnboarding.create({
            data: {
                credentialId: invitation.credentialId,
                currentStep: 1,
                totalSteps: 6,
                completedSteps: [],
                deviceInfo: deviceInfo as object | undefined,
            },
        });

        // Atualiza status do credential
        await this.prisma.supplierCredential.update({
            where: { id: invitation.credentialId },
            data: { status: SupplierCredentialStatus.ONBOARDING_STARTED },
        });

        // Registra no histórico
        await this.prisma.credentialStatusHistory.create({
            data: {
                credentialId: invitation.credentialId,
                fromStatus: validation.status as SupplierCredentialStatus,
                toStatus: SupplierCredentialStatus.ONBOARDING_STARTED,
                performedById: 'SYSTEM',
                reason: 'Onboarding iniciado pelo destinatário',
            },
        });

        // Marca convite como clicado
        if (!invitation.clickedAt) {
            await this.prisma.credentialInvitation.update({
                where: { id: invitation.id },
                data: { clickedAt: new Date() },
            });
        }

        this.logger.log(
            `Novo onboarding iniciado: ${onboarding.id} para credential ${invitation.credentialId}`,
        );

        // Notifica marca que facção iniciou onboarding
        await this.notificationsService
            .notifyBrandOnboardingStarted(invitation.credentialId)
            .catch((error) => {
                this.logger.error(`Falha ao enviar notificação: ${error.message}`);
            });

        return {
            onboardingId: onboarding.id,
            resumed: false,
            currentStep: 1,
        };
    }

    /**
     * Retorna progresso do onboarding
     */
    async getOnboardingProgress(token: string) {
        const invitation = await this.prisma.credentialInvitation.findUnique({
            where: { token },
            include: {
                credential: {
                    include: {
                        onboarding: true,
                    },
                },
            },
        });

        if (!invitation || !invitation.credential.onboarding) {
            return null;
        }

        return invitation.credential.onboarding;
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Formata CNPJ para exibição
     */
    private formatCNPJ(cnpj: string): string {
        const clean = cnpj.replace(/\D/g, '');
        if (clean.length !== 14) return cnpj;

        return clean.replace(
            /^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/,
            '$1.$2.$3/$4-$5',
        );
    }
}
