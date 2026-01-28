import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';

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
 * - Validação de CNPJ
 * - Análise de compliance/crédito
 * - Envio de convites (email/WhatsApp)
 * - Fluxo de onboarding
 */
@Module({
    imports: [
        PrismaModule,
        IntegrationsModule,
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
