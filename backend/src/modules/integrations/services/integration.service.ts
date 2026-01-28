import { Injectable, Logger } from '@nestjs/common';
import { InvitationType, RiskLevel } from '@prisma/client';

// CNPJ Providers
import { ICNPJProvider, CNPJValidationResult } from '../providers/cnpj/cnpj-provider.interface';
import { BrasilApiProvider } from '../providers/cnpj/brasil-api.provider';
import { ReceitaWsProvider } from '../providers/cnpj/receitaws.provider';

// Credit Providers
import { CreditAnalysisResult } from '../providers/credit/credit-provider.interface';
import { MockCreditProvider } from '../providers/credit/mock-credit.provider';

// Notification Providers
import { NotificationPayload, NotificationResult } from '../providers/notification/notification-provider.interface';
import { SendGridProvider } from '../providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from '../providers/notification/twilio-whatsapp.provider';

/**
 * Serviço central de integrações
 * Agrega todos os providers externos e implementa fallback automático
 */
@Injectable()
export class IntegrationService {
    private readonly logger = new Logger(IntegrationService.name);

    // Providers ordenados por prioridade
    private readonly cnpjProviders: ICNPJProvider[];

    constructor(
        // CNPJ Providers
        private readonly brasilApiProvider: BrasilApiProvider,
        private readonly receitaWsProvider: ReceitaWsProvider,
        // Credit Providers
        private readonly mockCreditProvider: MockCreditProvider,
        // Notification Providers
        private readonly sendGridProvider: SendGridProvider,
        private readonly twilioWhatsappProvider: TwilioWhatsappProvider,
    ) {
        // Ordena providers de CNPJ por prioridade (menor = maior prioridade)
        this.cnpjProviders = [
            this.brasilApiProvider,
            this.receitaWsProvider,
        ].sort((a, b) => a.priority - b.priority);
    }

    // ==================== CNPJ VALIDATION ====================

    /**
     * Valida um CNPJ usando os providers disponíveis (com fallback automático)
     * 
     * - Ordena providers por prioridade
     * - Tenta cada provider em sequência
     * - Se provider não disponível, pula para próximo
     * - Se CNPJ não encontrado, não tenta outros (resultado definitivo)
     * - Se todos falharem, retorna erro genérico
     */
    async validateCNPJ(cnpj: string): Promise<CNPJValidationResult> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (cleanCnpj.length !== 14) {
            return {
                isValid: false,
                error: 'CNPJ inválido. Deve conter 14 dígitos numéricos.',
                source: 'VALIDATION',
                timestamp: new Date(),
            };
        }

        const availableProviders: ICNPJProvider[] = [];

        // Filtra providers disponíveis
        for (const provider of this.cnpjProviders) {
            const available = await provider.isAvailable();
            if (available) {
                availableProviders.push(provider);
                this.logger.debug(`Provider ${provider.name} disponível (prioridade ${provider.priority})`);
            } else {
                this.logger.debug(`Provider ${provider.name} indisponível, pulando...`);
            }
        }

        if (availableProviders.length === 0) {
            this.logger.error('Nenhum provider de CNPJ disponível');
            return {
                isValid: false,
                error: 'Nenhum serviço de validação de CNPJ disponível no momento. Tente novamente mais tarde.',
                source: 'NONE',
                timestamp: new Date(),
            };
        }

        // Tenta cada provider em sequência
        for (const provider of availableProviders) {
            try {
                this.logger.log(`Tentando validar CNPJ via ${provider.name}`);
                const result = await provider.validate(cleanCnpj);

                // Se validou com sucesso (encontrou o CNPJ)
                if (result.data) {
                    this.logger.log(`CNPJ validado via ${provider.name} - Situação: ${result.data.situacao}`);
                    return result;
                }

                // Se CNPJ não foi encontrado (404), é um resultado definitivo
                // Não adianta tentar outros providers
                if (result.error?.includes('não encontrado')) {
                    this.logger.warn(`CNPJ não encontrado na base da Receita Federal`);
                    return result;
                }

                // Outro erro - tenta próximo provider
                this.logger.warn(`Provider ${provider.name} retornou erro: ${result.error}`);

            } catch (error) {
                this.logger.error(`Erro inesperado no provider ${provider.name}: ${error}`);
                // Continua para o próximo provider
            }
        }

        // Todos os providers falharam
        this.logger.error('Todos os providers de CNPJ falharam');
        return {
            isValid: false,
            error: 'Não foi possível validar o CNPJ. Todos os serviços retornaram erro. Tente novamente mais tarde.',
            source: 'FALLBACK',
            timestamp: new Date(),
        };
    }

    // ==================== CREDIT ANALYSIS ====================

    /**
     * Analisa o crédito de uma empresa pelo CNPJ
     * 
     * NOTA: Atualmente retorna dados mockados para desenvolvimento.
     * Em produção, integrar com Serasa, SPC, Boa Vista, etc.
     */
    async analyzeCredit(cnpj: string): Promise<CreditAnalysisResult | null> {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (cleanCnpj.length !== 14) {
            this.logger.warn('CNPJ inválido para análise de crédito');
            return null;
        }

        // Verifica se o mock provider está disponível
        const isAvailable = await this.mockCreditProvider.isAvailable();

        if (isAvailable) {
            this.logger.log(`[MOCK] Analisando crédito do CNPJ - Dados são simulados para desenvolvimento`);
            return this.mockCreditProvider.analyze(cleanCnpj);
        }

        // Fallback para mock inline caso o provider não esteja disponível
        this.logger.warn('[MOCK] Gerando resultado de crédito inline - Dados são simulados');

        // Gera score aleatório entre 300 e 900
        const score = Math.floor(Math.random() * 601) + 300;

        // Determina risk level baseado no score
        let riskLevel: RiskLevel;
        if (score >= 700) {
            riskLevel = RiskLevel.LOW;
        } else if (score >= 550) {
            riskLevel = RiskLevel.MEDIUM;
        } else if (score >= 400) {
            riskLevel = RiskLevel.HIGH;
        } else {
            riskLevel = RiskLevel.CRITICAL;
        }

        // Determina se tem negativações (mais provável com score baixo)
        const hasNegatives = score < 500 || Math.random() < 0.2;

        return {
            score,
            riskLevel,
            hasNegatives,
            recommendations: this.generateCreditRecommendations(score, hasNegatives),
            source: 'MOCK_INLINE',
            timestamp: new Date(),
            rawResponse: {
                _mock: true,
                _message: 'Dados simulados para desenvolvimento. Em produção, integrar com bureau de crédito.',
            },
        };
    }

    /**
     * Gera recomendações baseadas no score
     */
    private generateCreditRecommendations(score: number, hasNegatives: boolean): string[] {
        const recommendations: string[] = [];

        if (score >= 700) {
            recommendations.push('Empresa com excelente histórico de crédito');
            recommendations.push('Baixo risco para parceria comercial');
            recommendations.push('Condições de pagamento padrão recomendadas');
        } else if (score >= 550) {
            recommendations.push('Empresa com histórico de crédito moderado');
            recommendations.push('Recomendado solicitar garantias adicionais');
            if (hasNegatives) {
                recommendations.push('Verificar regularização de pendências antes de prosseguir');
            }
        } else {
            recommendations.push('Alto risco - revisão manual recomendada');
            recommendations.push('Exigir garantias ou pagamento antecipado');
            if (hasNegatives) {
                recommendations.push('Aguardar regularização das pendências financeiras');
            }
        }

        return recommendations;
    }

    // ==================== EMAIL NOTIFICATIONS ====================

    /**
     * Envia email via SendGrid
     */
    async sendEmail(payload: NotificationPayload): Promise<NotificationResult> {
        const isAvailable = await this.sendGridProvider.isAvailable();

        if (!isAvailable) {
            this.logger.error('SendGrid não configurado');
            return {
                success: false,
                error: 'Serviço de email não configurado. Configure SENDGRID_API_KEY.',
                provider: 'SENDGRID',
                type: InvitationType.EMAIL,
                timestamp: new Date(),
            };
        }

        this.logger.log(`Enviando email para ${this.maskEmail(payload.to)}`);
        return this.sendGridProvider.send(payload);
    }

    // ==================== WHATSAPP NOTIFICATIONS ====================

    /**
     * Envia mensagem WhatsApp via Twilio
     */
    async sendWhatsApp(payload: NotificationPayload): Promise<NotificationResult> {
        const isAvailable = await this.twilioWhatsappProvider.isAvailable();

        if (!isAvailable) {
            this.logger.error('Twilio WhatsApp não configurado');
            return {
                success: false,
                error: 'Serviço de WhatsApp não configurado. Configure TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM.',
                provider: 'TWILIO_WHATSAPP',
                type: InvitationType.WHATSAPP,
                timestamp: new Date(),
            };
        }

        this.logger.log(`Enviando WhatsApp para ${this.maskPhone(payload.to)}`);
        return this.twilioWhatsappProvider.send(payload);
    }

    // ==================== NOTIFICATION ROUTER ====================

    /**
     * Router para enviar notificação baseado no tipo
     */
    async sendNotification(
        type: 'EMAIL' | 'WHATSAPP',
        payload: NotificationPayload,
    ): Promise<NotificationResult> {
        switch (type) {
            case 'EMAIL':
                return this.sendEmail(payload);

            case 'WHATSAPP':
                return this.sendWhatsApp(payload);

            default:
                this.logger.error(`Tipo de notificação não suportado: ${type}`);
                return {
                    success: false,
                    error: `Tipo de notificação não suportado: ${type}`,
                    provider: 'NONE',
                    type: InvitationType.EMAIL,
                    timestamp: new Date(),
                };
        }
    }

    // ==================== PROVIDER STATUS ====================

    /**
     * Retorna o status de todos os providers
     */
    async getProvidersStatus(): Promise<Record<string, { available: boolean; name: string; type: string }>> {
        const [
            brasilApiAvailable,
            receitaWsAvailable,
            mockCreditAvailable,
            sendGridAvailable,
            twilioAvailable,
        ] = await Promise.all([
            this.brasilApiProvider.isAvailable(),
            this.receitaWsProvider.isAvailable(),
            this.mockCreditProvider.isAvailable(),
            this.sendGridProvider.isAvailable(),
            this.twilioWhatsappProvider.isAvailable(),
        ]);

        return {
            brasilApi: {
                name: this.brasilApiProvider.name,
                type: 'CNPJ',
                available: brasilApiAvailable,
            },
            receitaWs: {
                name: this.receitaWsProvider.name,
                type: 'CNPJ',
                available: receitaWsAvailable,
            },
            mockCredit: {
                name: this.mockCreditProvider.name,
                type: 'CREDIT',
                available: mockCreditAvailable,
            },
            sendGrid: {
                name: this.sendGridProvider.name,
                type: 'EMAIL',
                available: sendGridAvailable,
            },
            twilioWhatsapp: {
                name: this.twilioWhatsappProvider.name,
                type: 'WHATSAPP',
                available: twilioAvailable,
            },
        };
    }

    // ==================== UTILITY METHODS ====================

    /**
     * Mascara email para logs
     */
    private maskEmail(email: string): string {
        const [user, domain] = email.split('@');
        if (!domain) return '***';
        const maskedUser = user.length > 3
            ? `${user.slice(0, 2)}***${user.slice(-1)}`
            : '***';
        return `${maskedUser}@${domain}`;
    }

    /**
     * Mascara telefone para logs
     */
    private maskPhone(phone: string): string {
        const clean = phone.replace(/\D/g, '');
        if (clean.length < 8) return phone;
        return `+${clean.slice(0, 4)}****${clean.slice(-4)}`;
    }
}
