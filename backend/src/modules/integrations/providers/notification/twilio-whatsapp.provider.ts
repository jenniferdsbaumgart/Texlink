import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InvitationType } from '@prisma/client';
// eslint-disable-next-line @typescript-eslint/no-require-imports
const twilio = require('twilio');
import {
    INotificationProvider,
    NotificationPayload,
    NotificationResult,
    NotificationDeliveryStatus,
} from './notification-provider.interface';

// Tipo do cliente Twilio
interface TwilioClient {
    messages: {
        create(options: {
            to: string;
            from: string;
            body?: string;
            contentSid?: string;
            contentVariables?: string;
            statusCallback?: string;
        }): Promise<{
            sid: string;
            status: string;
            dateCreated: Date;
            direction: string;
            price?: string;
        }>;
    };
}

/**
 * Provider de envio de mensagens WhatsApp usando Twilio
 * https://www.twilio.com/docs/whatsapp/api
 * 
 * Configurações via variáveis de ambiente:
 * - TWILIO_ACCOUNT_SID: Account SID do Twilio
 * - TWILIO_AUTH_TOKEN: Auth Token do Twilio
 * - TWILIO_WHATSAPP_FROM: Número de origem do WhatsApp (com código do país)
 */
@Injectable()
export class TwilioWhatsappProvider implements INotificationProvider, OnModuleInit {
    readonly name = 'TWILIO_WHATSAPP';
    readonly type = InvitationType.WHATSAPP;

    private readonly logger = new Logger(TwilioWhatsappProvider.name);
    private readonly accountSid?: string;
    private readonly authToken?: string;
    private readonly fromNumber?: string;
    private client?: TwilioClient;
    private isConfigured = false;

    constructor(private readonly configService: ConfigService) {
        this.accountSid = this.configService.get<string>('TWILIO_ACCOUNT_SID');
        this.authToken = this.configService.get<string>('TWILIO_AUTH_TOKEN');
        this.fromNumber = this.configService.get<string>('TWILIO_WHATSAPP_FROM');
    }

    /**
     * Inicializa o cliente Twilio
     */
    onModuleInit() {
        if (this.accountSid && this.authToken && this.fromNumber) {
            this.client = twilio(this.accountSid, this.authToken);
            this.isConfigured = true;
            this.logger.log('Twilio WhatsApp configurado com sucesso');
        } else {
            const missing: string[] = [];
            if (!this.accountSid) missing.push('TWILIO_ACCOUNT_SID');
            if (!this.authToken) missing.push('TWILIO_AUTH_TOKEN');
            if (!this.fromNumber) missing.push('TWILIO_WHATSAPP_FROM');
            this.logger.warn(`Twilio WhatsApp não configurado: ${missing.join(', ')} não definido(s)`);
        }
    }

    /**
     * Verifica se o provider está disponível/configurado
     */
    async isAvailable(): Promise<boolean> {
        return this.isConfigured && !!this.client;
    }

    /**
     * Envia uma mensagem WhatsApp via Twilio
     */
    async send(payload: NotificationPayload): Promise<NotificationResult> {
        if (!this.isConfigured || !this.client) {
            return {
                success: false,
                error: 'Twilio não configurado. Defina TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN e TWILIO_WHATSAPP_FROM.',
                provider: this.name,
                type: this.type,
                timestamp: new Date(),
            };
        }

        try {
            const toNumber = this.formatWhatsappNumber(payload.to);
            const fromNumber = this.formatWhatsappNumber(this.fromNumber!);

            this.logger.log(`Enviando WhatsApp para ${this.maskPhone(toNumber)}`);

            const messageOptions: {
                to: string;
                from: string;
                body?: string;
                contentSid?: string;
                contentVariables?: string;
                statusCallback?: string;
            } = {
                to: `whatsapp:${toNumber}`,
                from: `whatsapp:${fromNumber}`,
            };

            // Se tem templateId (Content SID do Twilio), usa template
            if (payload.templateId) {
                messageOptions.contentSid = payload.templateId;

                if (payload.variables) {
                    messageOptions.contentVariables = JSON.stringify(payload.variables);
                }
            } else {
                // Mensagem direta (apenas para números aprovados no Twilio Sandbox)
                messageOptions.body = payload.content;
            }

            // Status callback URL para webhooks
            const statusCallback = this.configService.get<string>('TWILIO_STATUS_CALLBACK');
            if (statusCallback) {
                messageOptions.statusCallback = statusCallback;
            }

            const message = await this.client.messages.create(messageOptions);

            this.logger.log(`WhatsApp enviado com sucesso. SID: ${message.sid}`);

            return {
                success: true,
                messageId: message.sid,
                provider: this.name,
                type: this.type,
                timestamp: new Date(),
                cost: message.price ? parseFloat(message.price) : undefined,
                rawResponse: {
                    sid: message.sid,
                    status: message.status,
                    dateCreated: message.dateCreated,
                    direction: message.direction,
                },
            };
        } catch (error) {
            const errorInfo = this.handleError(error);
            this.logger.error(`Erro ao enviar WhatsApp: ${errorInfo.message}`);

            return {
                success: false,
                error: errorInfo.message,
                errorCode: errorInfo.code,
                provider: this.name,
                type: this.type,
                timestamp: new Date(),
                rawResponse: errorInfo.raw,
            };
        }
    }

    /**
     * Processa webhook de status do Twilio
     */
    async handleWebhook(payload: unknown): Promise<NotificationDeliveryStatus | null> {
        const event = payload as Record<string, unknown>;

        if (!event.MessageSid) {
            return null;
        }

        const statusMap: Record<string, NotificationDeliveryStatus['status']> = {
            'queued': 'queued',
            'sent': 'sent',
            'delivered': 'delivered',
            'read': 'opened',
            'failed': 'failed',
            'undelivered': 'failed',
        };

        const twilioStatus = (event.MessageStatus || event.SmsStatus) as string;
        const status = statusMap[twilioStatus?.toLowerCase()];

        if (!status) {
            return null;
        }

        return {
            messageId: event.MessageSid as string,
            status,
            timestamp: new Date(),
            metadata: {
                from: event.From,
                to: event.To,
                accountSid: event.AccountSid,
                errorCode: event.ErrorCode,
            },
            error: event.ErrorMessage as string | undefined,
        };
    }

    /**
     * Formata número de telefone para o formato WhatsApp do Twilio
     * - Remove caracteres não numéricos
     * - Adiciona código do Brasil (+55) se necessário
     * - Garante que começa com +
     */
    private formatWhatsappNumber(phone: string): string {
        // Remove tudo que não é número
        let clean = phone.replace(/\D/g, '');

        // Se não começa com código do país (55 para Brasil),
        // e tem 10-11 dígitos (celular brasileiro), adiciona 55
        if (!clean.startsWith('55') && (clean.length === 10 || clean.length === 11)) {
            clean = `55${clean}`;
        }

        // Garante que começa com +
        if (!clean.startsWith('+')) {
            clean = `+${clean}`;
        }

        return clean;
    }

    /**
     * Mascara número de telefone para logs
     */
    private maskPhone(phone: string): string {
        const clean = phone.replace(/\D/g, '');
        if (clean.length < 8) return phone;
        return `+${clean.slice(0, 4)}****${clean.slice(-4)}`;
    }

    /**
     * Trata erros do Twilio
     */
    private handleError(error: unknown): { message: string; code?: string; raw?: Record<string, unknown> } {
        // Erro específico do Twilio
        if (this.isTwilioError(error)) {
            const errorCode = error.code;

            // Mapeamento de códigos de erro comuns do Twilio
            const errorMessages: Record<number, string> = {
                20003: 'Autenticação inválida. Verifique Account SID e Auth Token',
                20008: 'Recurso não encontrado',
                21211: 'Número de telefone inválido',
                21408: 'Permissão negada para este número',
                21610: 'Número não suporta WhatsApp',
                21614: 'Número não é um número de WhatsApp válido',
                21617: 'Mensagem não permitida fora da janela de 24h. Use templates aprovados.',
                21618: 'O número de destino não está registrado no WhatsApp',
                30003: 'Número de destino inacessível',
                30007: 'Mensagem filtrada como spam',
                30008: 'Número desconhecido ou inexistente',
                63003: 'Canal não configurado corretamente',
                63016: 'Template de conteúdo não encontrado. Verifique o Content SID.',
                63018: 'Variáveis do template inválidas ou incompletas',
            };

            const friendlyMessage = errorMessages[errorCode];

            return {
                message: friendlyMessage || error.message || `Erro Twilio ${errorCode}`,
                code: errorCode?.toString(),
                raw: {
                    code: errorCode,
                    message: error.message,
                    moreInfo: error.moreInfo,
                    status: error.status,
                },
            };
        }

        // Erro genérico
        if (error instanceof Error) {
            return { message: error.message };
        }

        return { message: 'Erro desconhecido ao enviar WhatsApp' };
    }

    /**
     * Type guard para erro do Twilio
     */
    private isTwilioError(error: unknown): error is {
        code: number;
        message: string;
        moreInfo?: string;
        status?: number;
    } {
        return (
            typeof error === 'object' &&
            error !== null &&
            'code' in error &&
            typeof (error as Record<string, unknown>).code === 'number'
        );
    }
}
