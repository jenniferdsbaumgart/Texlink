import { Module } from '@nestjs/common';
import { CredentialSettingsController } from './credential-settings.controller';
import { CredentialSettingsService } from './credential-settings.service';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [CredentialSettingsController],
    providers: [CredentialSettingsService],
    exports: [CredentialSettingsService],
})
export class CredentialSettingsModule {}
