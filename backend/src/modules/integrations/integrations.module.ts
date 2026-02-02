import { Module, Global } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { HttpModule } from '@nestjs/axios';

// CNPJ Providers
import { BrasilApiProvider } from './providers/cnpj/brasil-api.provider';
import { ReceitaWsProvider } from './providers/cnpj/receitaws.provider';

// Credit Providers
import { MockCreditProvider } from './providers/credit/mock-credit.provider';

// Notification Providers
import { SendGridProvider } from './providers/notification/sendgrid.provider';
import { TwilioWhatsappProvider } from './providers/notification/twilio-whatsapp.provider';

// Services
import { IntegrationService } from './services/integration.service';

/**
 * Módulo global de integrações externas
 *
 * Gerencia todos os providers de:
 * - Validação de CNPJ (Brasil API, ReceitaWS)
 * - Análise de Crédito (Mock - futuro: Serasa, SPC, Boa Vista)
 * - Notificações (SendGrid para email, Twilio para WhatsApp)
 *
 * Configurações via variáveis de ambiente:
 * - CNPJ: RECEITAWS_URL, RECEITAWS_API_KEY
 * - Email: SENDGRID_API_KEY, SENDGRID_FROM_EMAIL, SENDGRID_FROM_NAME
 * - WhatsApp: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_FROM
 * - Crédito: SERASA_API_URL, SERASA_API_KEY, SERASA_API_SECRET (futuro)
 */
@Global()
@Module({
  imports: [
    ConfigModule,
    HttpModule.register({
      timeout: 30000, // 30 segundos timeout padrão
      maxRedirects: 3,
    }),
  ],
  providers: [
    // CNPJ Providers
    BrasilApiProvider,
    ReceitaWsProvider,

    // Credit Providers
    MockCreditProvider,

    // Notification Providers
    SendGridProvider,
    TwilioWhatsappProvider,

    // Main Service
    IntegrationService,
  ],
  exports: [
    // Export principal service
    IntegrationService,

    // Export providers individuais para casos especiais
    BrasilApiProvider,
    ReceitaWsProvider,
    MockCreditProvider,
    SendGridProvider,
    TwilioWhatsappProvider,
  ],
})
export class IntegrationsModule {}
