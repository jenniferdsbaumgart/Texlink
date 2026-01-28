import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NotificationsModule } from '../notifications/notifications.module';
import { OnboardingService } from './onboarding.service';
import { OnboardingController } from './onboarding.controller';

/**
 * Módulo de Onboarding Público
 *
 * Gerencia o fluxo público de onboarding de facções:
 * - Validação de token de convite (sem autenticação)
 * - Criação de conta de facção
 * - Progresso do onboarding
 * - Upload de documentos
 */
@Module({
    imports: [PrismaModule, NotificationsModule],
    controllers: [OnboardingController],
    providers: [OnboardingService],
    exports: [OnboardingService],
})
export class OnboardingModule { }
