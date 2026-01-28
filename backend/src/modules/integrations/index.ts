// Module
export { IntegrationsModule } from './integrations.module';

// Services
export { IntegrationService } from './services/integration.service';

// CNPJ Provider Interfaces and Implementations
export type {
    ICNPJProvider,
    CNPJData,
    CNPJValidationResult,
    CNPJEndereco,
    CNPJSocio,
    CNPJAtividade,
} from './providers/cnpj/cnpj-provider.interface';
export { CNPJ_PROVIDERS } from './providers/cnpj/cnpj-provider.interface';
export { BrasilApiProvider } from './providers/cnpj/brasil-api.provider';
export { ReceitaWsProvider } from './providers/cnpj/receitaws.provider';

// Credit Provider Interfaces and Implementations
export type {
    ICreditProvider,
    CreditAnalysisResult,
    CreditNegative,
    CreditProtesto,
    CreditChequeSemFundo,
    CreditSummary,
} from './providers/credit/credit-provider.interface';
export { CREDIT_PROVIDERS } from './providers/credit/credit-provider.interface';
export { MockCreditProvider } from './providers/credit/mock-credit.provider';

// Notification Provider Interfaces and Implementations
export type {
    INotificationProvider,
    NotificationPayload,
    NotificationResult,
    NotificationAttachment,
    NotificationDeliveryStatus,
} from './providers/notification/notification-provider.interface';
export { NOTIFICATION_PROVIDERS } from './providers/notification/notification-provider.interface';
export { SendGridProvider } from './providers/notification/sendgrid.provider';
export { TwilioWhatsappProvider } from './providers/notification/twilio-whatsapp.provider';
