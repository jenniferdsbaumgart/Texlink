import { InvitationType } from '@prisma/client';

// Anexo para email
export interface NotificationAttachment {
  filename: string;
  content: string | Buffer;
  contentType: string;
  contentId?: string; // Para imagens inline
}

// Payload para envio de notificação
export interface NotificationPayload {
  /** Destinatário (email, telefone, etc) */
  to: string;

  /** Assunto (obrigatório para email) */
  subject?: string;

  /** Conteúdo da mensagem (HTML para email, texto para WhatsApp/SMS) */
  content: string;

  /** ID do template do provider (SendGrid, Twilio, etc) */
  templateId?: string;

  /** Variáveis para substituição no template */
  variables?: Record<string, string>;

  /** Anexos (apenas para email) */
  attachments?: NotificationAttachment[];

  /** Remetente customizado (para email) */
  from?: {
    email: string;
    name?: string;
  };

  /** Reply-to (para email) */
  replyTo?: string;

  /** Metadados customizados para rastreamento */
  metadata?: Record<string, string>;

  /** Agendar envio */
  scheduledAt?: Date;
}

// Resultado do envio
export interface NotificationResult {
  /** Se o envio foi bem sucedido */
  success: boolean;

  /** ID da mensagem no provider */
  messageId?: string;

  /** Mensagem de erro, se houver */
  error?: string;

  /** Código de erro do provider */
  errorCode?: string;

  /** Nome do provider usado */
  provider: string;

  /** Tipo de notificação */
  type: InvitationType;

  /** Timestamp do envio */
  timestamp: Date;

  /** Custo do envio (se aplicável) */
  cost?: number;

  /** Resposta bruta do provider */
  rawResponse?: Record<string, unknown>;
}

// Status de delivery (para webhooks)
export interface NotificationDeliveryStatus {
  messageId: string;
  status:
    | 'queued'
    | 'sent'
    | 'delivered'
    | 'opened'
    | 'clicked'
    | 'bounced'
    | 'failed'
    | 'unsubscribed';
  timestamp: Date;
  metadata?: Record<string, unknown>;
  error?: string;
}

// Interface que todos os providers de notificação devem implementar
export interface INotificationProvider {
  /** Nome único do provider */
  readonly name: string;

  /** Tipo de notificação que este provider suporta */
  readonly type: InvitationType;

  /**
   * Envia uma notificação
   * @param payload Dados da notificação
   */
  send(payload: NotificationPayload): Promise<NotificationResult>;

  /**
   * Verifica se o provider está disponível/configurado
   */
  isAvailable(): Promise<boolean>;

  /**
   * Processa webhook de status (opcional)
   */
  handleWebhook?(payload: unknown): Promise<NotificationDeliveryStatus | null>;
}

// Token de injeção para os providers
export const NOTIFICATION_PROVIDERS = 'NOTIFICATION_PROVIDERS';
