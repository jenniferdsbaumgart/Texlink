import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { IntegrationsModule } from '../integrations/integrations.module';
import { NotificationsService } from './notifications.service';

/**
 * Módulo de Notificações
 *
 * Gerencia envio de notificações para:
 * - Marcas (sobre progresso de credenciamento)
 * - Facções (convites, lembretes, etc)
 *
 * Fase 1: Email básico via SendGrid
 * Futuro: Templates customizáveis, preferências, histórico, etc.
 */
@Module({
    imports: [PrismaModule, IntegrationsModule],
    providers: [NotificationsService],
    exports: [NotificationsService],
})
export class NotificationsModule { }
