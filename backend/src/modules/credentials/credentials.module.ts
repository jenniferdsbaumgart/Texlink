import { Module, forwardRef } from '@nestjs/common';
import { CacheModule } from '@nestjs/cache-manager';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsModule } from '../notifications/notifications.module';

// Main service and controller
import { CredentialsService } from './credentials.service';
import { CredentialsController } from './credentials.controller';

// Sub-services
import { ValidationService } from './services/validation.service';
import { ComplianceService } from './services/compliance.service';
import { InvitationService } from './services/invitation.service';

/**
 * Módulo de Credenciamento de Facções
 *
 * Gerencia todo o fluxo de credenciamento:
 * - Cadastro de novas facções
 * - Validação de CNPJ (com cache de 30 dias)
 * - Análise de compliance/crédito
 * - Envio de convites (email/WhatsApp)
 * - Fluxo de onboarding
 * - Notificações automáticas
 */
@Module({
    imports: [
        PrismaModule,
        IntegrationsModule,
        forwardRef(() => NotificationsModule),
        CacheModule.register({
            ttl: 30 * 24 * 60 * 60 * 1000, // 30 dias em ms
            max: 1000, // Máximo 1000 itens em cache
        }),
    ],
    controllers: [
        CredentialsController,
    ],
    providers: [
        // Main service
        CredentialsService,

        // Sub-services
        ValidationService,
        ComplianceService,
        InvitationService,
    ],
    exports: [
        CredentialsService,
        ValidationService,
        ComplianceService,
        InvitationService,
    ],
})
export class CredentialsModule { }
