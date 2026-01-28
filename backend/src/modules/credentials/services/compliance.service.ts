import {
    Injectable,
    Logger,
    NotFoundException,
    ForbiddenException,
    BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { IntegrationService } from '../../integrations/services/integration.service';
import {
    SupplierCredentialStatus,
    RiskLevel,
    ManualReviewStatus,
} from '@prisma/client';

interface AuthUser {
    id: string;
    companyId: string;
    brandId?: string;
}

interface ComplianceScores {
    creditScore: number;
    taxScore: number;
    legalScore: number;
    overallScore: number;
}

interface ComplianceFlags {
    hasActiveCNPJ: boolean;
    hasRegularTaxStatus: boolean;
    hasNegativeCredit: boolean;
    hasLegalIssues: boolean;
    hasRelatedRestrictions: boolean;
}

/**
 * Serviço responsável pela análise de compliance de facções
 * 
 * Gerencia o fluxo de compliance:
 * 1. Análise automática (analyzeCompliance)
 * 2. Aprovação manual (approveCompliance)
 * 3. Rejeição manual (rejectCompliance)
 * 4. Consulta de análise (getCompliance)
 */
@Injectable()
export class ComplianceService {
    private readonly logger = new Logger(ComplianceService.name);

    // Status que permitem análise de compliance
    private readonly ANALYZABLE_STATUSES: SupplierCredentialStatus[] = [
        SupplierCredentialStatus.PENDING_COMPLIANCE,
        SupplierCredentialStatus.COMPLIANCE_REJECTED,
    ];

    // Pesos para cálculo do score overall
    private readonly SCORE_WEIGHTS = {
        credit: 0.4,   // 40% peso crédito
        tax: 0.35,     // 35% peso fiscal
        legal: 0.25,   // 25% peso legal
    };

    constructor(
        private readonly prisma: PrismaService,
        private readonly integrationService: IntegrationService,
    ) { }

    // ==================== ANALYZE COMPLIANCE ====================

    /**
     * Executa análise completa de compliance
     * 
     * - Busca credential com validações
     * - Chama IntegrationService.analyzeCredit
     * - Calcula scores (credit, tax, legal, overall)
     * - Determina riskLevel e recommendation
     * - Salva ComplianceAnalysis
     * - Atualiza status do credential
     */
    async analyzeCompliance(credentialId: string, performedById?: string) {
        // Busca credential com validações
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
            include: {
                validations: {
                    orderBy: { createdAt: 'desc' },
                    take: 1,
                },
            },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${credentialId} não encontrado`);
        }

        // Valida status
        if (!this.ANALYZABLE_STATUSES.includes(credential.status)) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser analisado. ` +
                `Status permitidos: ${this.ANALYZABLE_STATUSES.join(', ')}`,
            );
        }

        this.logger.log(`Iniciando análise de compliance para ${credentialId}`);

        // Obtém última validação
        const lastValidation = credential.validations[0];

        // Chama API de análise de crédito (mock por enquanto)
        const creditResult = await this.integrationService.analyzeCredit(credential.cnpj);

        // Calcula scores
        const scores = this.calculateScores(lastValidation, creditResult);

        // Determina nível de risco
        const riskLevel = this.determineRiskLevel(scores.overallScore);

        // Define flags
        const flags = this.determineFlags(lastValidation, creditResult);

        // Gera recomendação
        const recommendation = this.generateRecommendation(riskLevel, flags);

        // Fatores de risco identificados
        const riskFactors = this.identifyRiskFactors(lastValidation, creditResult, flags);

        // Salva ou atualiza análise de compliance
        const analysis = await this.prisma.complianceAnalysis.upsert({
            where: { credentialId },
            create: {
                credentialId,
                overallScore: scores.overallScore,
                creditScore: scores.creditScore,
                taxScore: scores.taxScore,
                legalScore: scores.legalScore,
                riskLevel,
                riskFactors: riskFactors as object,
                hasActiveCNPJ: flags.hasActiveCNPJ,
                hasRegularTaxStatus: flags.hasRegularTaxStatus,
                hasNegativeCredit: flags.hasNegativeCredit,
                hasLegalIssues: flags.hasLegalIssues,
                hasRelatedRestrictions: flags.hasRelatedRestrictions,
                recommendation: recommendation.action,
                recommendationReason: recommendation.reason,
                requiresManualReview: recommendation.requiresManualReview,
                manualReviewStatus: recommendation.requiresManualReview
                    ? ManualReviewStatus.PENDING
                    : null,
            },
            update: {
                overallScore: scores.overallScore,
                creditScore: scores.creditScore,
                taxScore: scores.taxScore,
                legalScore: scores.legalScore,
                riskLevel,
                riskFactors: riskFactors as object,
                hasActiveCNPJ: flags.hasActiveCNPJ,
                hasRegularTaxStatus: flags.hasRegularTaxStatus,
                hasNegativeCredit: flags.hasNegativeCredit,
                hasLegalIssues: flags.hasLegalIssues,
                hasRelatedRestrictions: flags.hasRelatedRestrictions,
                recommendation: recommendation.action,
                recommendationReason: recommendation.reason,
                requiresManualReview: recommendation.requiresManualReview,
                manualReviewStatus: recommendation.requiresManualReview
                    ? ManualReviewStatus.PENDING
                    : undefined,
                // Reset manual review se está sendo reanalisado
                reviewedById: null,
                reviewedAt: null,
                manualReviewNotes: null,
            },
        });

        // Atualiza status do credential baseado na recomendação
        const newStatus = this.getStatusFromRecommendation(recommendation);

        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            newStatus,
            performedById || 'SYSTEM',
            recommendation.reason,
        );

        this.logger.log(
            `Análise de compliance concluída para ${credentialId}: ` +
            `Risk=${riskLevel}, Score=${scores.overallScore}, Action=${recommendation.action}`,
        );

        return {
            analysis,
            scores,
            riskLevel,
            flags,
            recommendation,
            nextStep: recommendation.requiresManualReview
                ? 'MANUAL_REVIEW'
                : recommendation.action === 'APPROVE'
                    ? 'SEND_INVITATION'
                    : 'REVIEW_AND_FIX',
        };
    }

    // ==================== APPROVE COMPLIANCE ====================

    /**
     * Aprova compliance manualmente
     * 
     * - Valida que está em PENDING_COMPLIANCE ou requer revisão manual
     * - Atualiza ComplianceAnalysis com aprovação
     * - Atualiza status para INVITATION_PENDING
     */
    async approveCompliance(credentialId: string, notes: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;

        // Busca credential e valida propriedade
        const credential = await this.findAndValidateCredential(credentialId, companyId);

        // Busca análise de compliance
        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
        });

        if (!analysis) {
            throw new BadRequestException(
                'Credenciamento não possui análise de compliance. Execute a análise primeiro.',
            );
        }

        // Valida que pode ser aprovado manualmente
        const approvableStatuses: SupplierCredentialStatus[] = [
            SupplierCredentialStatus.PENDING_COMPLIANCE,
            SupplierCredentialStatus.COMPLIANCE_REJECTED,
        ];

        if (!approvableStatuses.includes(credential.status as SupplierCredentialStatus) && !analysis.requiresManualReview) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser aprovado manualmente.`,
            );
        }

        // Atualiza análise de compliance
        const updatedAnalysis = await this.prisma.complianceAnalysis.update({
            where: { credentialId },
            data: {
                manualReviewStatus: ManualReviewStatus.APPROVED,
                manualReviewNotes: notes,
                reviewedById: user.id,
                reviewedAt: new Date(),
                recommendation: 'APPROVE',
                recommendationReason: `Aprovado manualmente: ${notes}`,
            },
        });

        // Atualiza status para INVITATION_PENDING
        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            SupplierCredentialStatus.INVITATION_PENDING,
            user.id,
            `Compliance aprovado manualmente: ${notes}`,
        );

        this.logger.log(`Compliance aprovado manualmente para ${credentialId} por ${user.id}`);

        return {
            success: true,
            analysis: updatedAnalysis,
            message: 'Compliance aprovado. Credenciamento pronto para envio de convite.',
            nextStep: 'SEND_INVITATION',
        };
    }

    // ==================== REJECT COMPLIANCE ====================

    /**
     * Rejeita compliance manualmente
     * 
     * - Valida que está em status que permite rejeição
     * - Atualiza ComplianceAnalysis com rejeição
     * - Atualiza status para COMPLIANCE_REJECTED
     */
    async rejectCompliance(credentialId: string, reason: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;

        // Busca credential e valida propriedade
        const credential = await this.findAndValidateCredential(credentialId, companyId);

        // Busca análise de compliance
        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
        });

        if (!analysis) {
            throw new BadRequestException(
                'Credenciamento não possui análise de compliance. Execute a análise primeiro.',
            );
        }

        // Valida que pode ser rejeitado
        const rejectableStatuses: SupplierCredentialStatus[] = [
            SupplierCredentialStatus.PENDING_COMPLIANCE,
            SupplierCredentialStatus.COMPLIANCE_APPROVED,
            SupplierCredentialStatus.INVITATION_PENDING,
        ];

        if (!rejectableStatuses.includes(credential.status as SupplierCredentialStatus) && !analysis.requiresManualReview) {
            throw new BadRequestException(
                `Credenciamento com status "${credential.status}" não pode ser rejeitado.`,
            );
        }

        // Atualiza análise de compliance
        const updatedAnalysis = await this.prisma.complianceAnalysis.update({
            where: { credentialId },
            data: {
                manualReviewStatus: ManualReviewStatus.REJECTED,
                manualReviewNotes: reason,
                reviewedById: user.id,
                reviewedAt: new Date(),
                recommendation: 'REJECT',
                recommendationReason: `Rejeitado manualmente: ${reason}`,
            },
        });

        // Atualiza status para COMPLIANCE_REJECTED
        await this.updateCredentialStatus(
            credentialId,
            credential.status,
            SupplierCredentialStatus.COMPLIANCE_REJECTED,
            user.id,
            `Compliance rejeitado: ${reason}`,
        );

        this.logger.log(`Compliance rejeitado para ${credentialId} por ${user.id}: ${reason}`);

        return {
            success: true,
            analysis: updatedAnalysis,
            message: 'Compliance rejeitado. Credenciamento bloqueado.',
            nextStep: 'ARCHIVED',
        };
    }

    // ==================== GET COMPLIANCE ====================

    /**
     * Retorna análise de compliance de um credenciamento
     */
    async getCompliance(credentialId: string, companyId: string) {
        // Valida que credential pertence à marca
        await this.findAndValidateCredential(credentialId, companyId);

        const analysis = await this.prisma.complianceAnalysis.findUnique({
            where: { credentialId },
            include: {
                reviewedBy: {
                    select: { id: true, name: true, email: true },
                },
            },
        });

        if (!analysis) {
            return null;
        }

        return analysis;
    }

    /**
     * Retorna credenciamentos pendentes de revisão manual
     */
    async getPendingReviews(companyId?: string) {
        const where: any = {
            requiresManualReview: true,
            manualReviewStatus: ManualReviewStatus.PENDING,
        };

        if (companyId) {
            where.credential = { brandId: companyId };
        }

        return this.prisma.complianceAnalysis.findMany({
            where,
            include: {
                credential: {
                    select: {
                        id: true,
                        cnpj: true,
                        tradeName: true,
                        legalName: true,
                        contactName: true,
                        contactEmail: true,
                        status: true,
                        createdAt: true,
                    },
                },
            },
            orderBy: [
                { riskLevel: 'desc' }, // CRITICAL primeiro
                { createdAt: 'asc' },  // Mais antigos primeiro
            ],
        });
    }

    /**
     * Método legado para análise de crédito simples
     */
    async analyzeCredit(cnpj: string, credentialId: string) {
        const result = await this.integrationService.analyzeCredit(cnpj);

        if (!result) {
            return null;
        }

        return {
            analysis: await this.prisma.complianceAnalysis.upsert({
                where: { credentialId },
                create: {
                    credentialId,
                    riskLevel: result.riskLevel,
                    creditScore: result.score,
                    overallScore: result.score,
                    hasNegativeCredit: result.hasNegatives,
                    recommendation: this.getRecommendationFromRisk(result.riskLevel),
                    recommendationReason: result.recommendations?.join('; '),
                    requiresManualReview: result.riskLevel === RiskLevel.HIGH || result.riskLevel === RiskLevel.CRITICAL,
                },
                update: {
                    riskLevel: result.riskLevel,
                    creditScore: result.score,
                    overallScore: result.score,
                    hasNegativeCredit: result.hasNegatives,
                    recommendation: this.getRecommendationFromRisk(result.riskLevel),
                    recommendationReason: result.recommendations?.join('; '),
                    requiresManualReview: result.riskLevel === RiskLevel.HIGH || result.riskLevel === RiskLevel.CRITICAL,
                },
            }),
            result,
        };
    }

    // ==================== PRIVATE HELPERS ====================

    /**
     * Busca credential e valida que pertence à marca
     */
    private async findAndValidateCredential(credentialId: string, companyId: string) {
        const credential = await this.prisma.supplierCredential.findUnique({
            where: { id: credentialId },
        });

        if (!credential) {
            throw new NotFoundException(`Credenciamento ${credentialId} não encontrado`);
        }

        if (credential.brandId !== companyId) {
            throw new ForbiddenException('Credenciamento pertence a outra marca');
        }

        return credential;
    }

    /**
     * Calcula scores de compliance
     */
    private calculateScores(validation: any, creditResult: any): ComplianceScores {
        // Credit Score (0-100)
        const creditScore = creditResult?.score
            ? Math.round(creditResult.score / 10) // Normaliza de 0-1000 para 0-100
            : 50;

        // Tax Score baseado no status do CNPJ
        let taxScore = 50; // Default
        if (validation?.companyStatus) {
            const status = validation.companyStatus.toUpperCase();
            if (status === 'ATIVA' || status === 'REGULAR') {
                taxScore = 100;
            } else if (status === 'SUSPENSA') {
                taxScore = 30;
            } else if (status === 'INAPTA' || status === 'BAIXADA') {
                taxScore = 0;
            }
        }

        // Legal Score (100 se não houver issues conhecidos)
        const legalScore = creditResult?.hasNegatives ? 40 : 100;

        // Overall Score (média ponderada)
        const overallScore = Math.round(
            creditScore * this.SCORE_WEIGHTS.credit +
            taxScore * this.SCORE_WEIGHTS.tax +
            legalScore * this.SCORE_WEIGHTS.legal,
        );

        return { creditScore, taxScore, legalScore, overallScore };
    }

    /**
     * Determina nível de risco baseado no score overall
     */
    private determineRiskLevel(overallScore: number): RiskLevel {
        if (overallScore >= 70) return RiskLevel.LOW;
        if (overallScore >= 50) return RiskLevel.MEDIUM;
        if (overallScore >= 30) return RiskLevel.HIGH;
        return RiskLevel.CRITICAL;
    }

    /**
     * Define flags de compliance
     */
    private determineFlags(validation: any, creditResult: any): ComplianceFlags {
        const status = validation?.companyStatus?.toUpperCase() || '';

        return {
            hasActiveCNPJ: status === 'ATIVA' || status === 'REGULAR',
            hasRegularTaxStatus: status === 'ATIVA' || status === 'REGULAR',
            hasNegativeCredit: creditResult?.hasNegatives || false,
            hasLegalIssues: false, // TODO: Integrar com APIs de processos judiciais
            hasRelatedRestrictions: false, // TODO: Integrar com APIs de restrições
        };
    }

    /**
     * Gera recomendação baseada no risco e flags
     */
    private generateRecommendation(
        riskLevel: RiskLevel,
        flags: ComplianceFlags,
    ): { action: string; reason: string; requiresManualReview: boolean } {
        // CNPJ inativo é sempre rejeição
        if (!flags.hasActiveCNPJ) {
            return {
                action: 'REJECT',
                reason: 'CNPJ não está ativo na Receita Federal',
                requiresManualReview: false,
            };
        }

        // Por nível de risco
        switch (riskLevel) {
            case RiskLevel.LOW:
                return {
                    action: 'APPROVE',
                    reason: 'Análise de compliance aprovada automaticamente. Baixo risco.',
                    requiresManualReview: false,
                };

            case RiskLevel.MEDIUM:
                return {
                    action: 'APPROVE',
                    reason: 'Análise de compliance aprovada. Risco médio - acompanhar.',
                    requiresManualReview: false,
                };

            case RiskLevel.HIGH:
                return {
                    action: 'MANUAL_REVIEW',
                    reason: 'Risco alto identificado. Requer aprovação manual.',
                    requiresManualReview: true,
                };

            case RiskLevel.CRITICAL:
                return {
                    action: 'REJECT',
                    reason: 'Risco crítico identificado. Recomendação de rejeição.',
                    requiresManualReview: true, // Permite override manual
                };

            default:
                return {
                    action: 'MANUAL_REVIEW',
                    reason: 'Não foi possível determinar risco. Requer revisão manual.',
                    requiresManualReview: true,
                };
        }
    }

    /**
     * Identifica fatores de risco
     */
    private identifyRiskFactors(
        validation: any,
        creditResult: any,
        flags: ComplianceFlags,
    ): string[] {
        const factors: string[] = [];

        if (!flags.hasActiveCNPJ) {
            factors.push('CNPJ não está ativo');
        }

        if (!flags.hasRegularTaxStatus) {
            factors.push('Situação fiscal irregular');
        }

        if (flags.hasNegativeCredit) {
            factors.push('Possui negativações no mercado');
        }

        if (creditResult?.score && creditResult.score < 500) {
            factors.push('Score de crédito baixo');
        }

        if (creditResult?.recommendations) {
            factors.push(...creditResult.recommendations);
        }

        // Empresa muito nova (menos de 1 ano)
        if (validation?.foundedAt) {
            const foundedDate = new Date(validation.foundedAt);
            const oneYearAgo = new Date();
            oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

            if (foundedDate > oneYearAgo) {
                factors.push('Empresa com menos de 1 ano de atividade');
            }
        }

        return factors;
    }

    /**
     * Define status do credential baseado na recomendação
     */
    private getStatusFromRecommendation(
        recommendation: { action: string; requiresManualReview: boolean },
    ): SupplierCredentialStatus {
        if (recommendation.action === 'APPROVE' && !recommendation.requiresManualReview) {
            return SupplierCredentialStatus.INVITATION_PENDING;
        }

        if (recommendation.action === 'REJECT' && !recommendation.requiresManualReview) {
            return SupplierCredentialStatus.COMPLIANCE_REJECTED;
        }

        // Precisa de revisão manual
        return SupplierCredentialStatus.PENDING_COMPLIANCE;
    }

    /**
     * Recomendação simples baseada em risco
     */
    private getRecommendationFromRisk(riskLevel: RiskLevel): string {
        switch (riskLevel) {
            case RiskLevel.LOW:
            case RiskLevel.MEDIUM:
                return 'APPROVE';
            case RiskLevel.HIGH:
                return 'MANUAL_REVIEW';
            case RiskLevel.CRITICAL:
                return 'REJECT';
            default:
                return 'MANUAL_REVIEW';
        }
    }

    /**
     * Atualiza status do credential e registra no histórico
     */
    private async updateCredentialStatus(
        credentialId: string,
        fromStatus: SupplierCredentialStatus,
        toStatus: SupplierCredentialStatus,
        performedById: string,
        reason: string,
    ) {
        // Registra no histórico
        await this.prisma.credentialStatusHistory.create({
            data: {
                credentialId,
                fromStatus,
                toStatus,
                performedById,
                reason,
            },
        });

        // Atualiza status
        await this.prisma.supplierCredential.update({
            where: { id: credentialId },
            data: { status: toStatus },
        });
    }
}
