import {
    Controller,
    Get,
    Post,
    Patch,
    Delete,
    Body,
    Param,
    UseGuards,
    ParseUUIDPipe,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiBearerAuth,
    ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { CredentialSettingsService } from './credential-settings.service';
import {
    CreateInvitationTemplateDto,
    UpdateInvitationTemplateDto,
} from './dto';

interface AuthUser {
    id: string;
    email: string;
    companyId: string;
    brandId?: string;
}

@ApiTags('Configurações de Credenciamento')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('credential-settings')
export class CredentialSettingsController {
    constructor(
        private readonly settingsService: CredentialSettingsService,
    ) {}

    // ==================== INVITATION TEMPLATES ====================

    @Get('invitation-templates')
    @ApiOperation({ summary: 'Listar templates de convite' })
    @ApiResponse({ status: 200, description: 'Lista de templates' })
    async getInvitationTemplates(@CurrentUser() user: AuthUser) {
        const companyId = user.brandId || user.companyId;
        return this.settingsService.getInvitationTemplates(companyId);
    }

    @Get('invitation-templates/:id')
    @ApiOperation({ summary: 'Buscar template de convite por ID' })
    @ApiParam({ name: 'id', description: 'ID do template' })
    @ApiResponse({ status: 200, description: 'Template encontrado' })
    @ApiResponse({ status: 404, description: 'Template não encontrado' })
    async getInvitationTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;
        return this.settingsService.getInvitationTemplate(id, companyId);
    }

    @Post('invitation-templates')
    @ApiOperation({ summary: 'Criar template de convite' })
    @ApiResponse({ status: 201, description: 'Template criado' })
    @ApiResponse({ status: 409, description: 'Template com mesmo nome já existe' })
    @ApiResponse({ status: 400, description: 'Variáveis inválidas no template' })
    async createInvitationTemplate(
        @Body() dto: CreateInvitationTemplateDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.settingsService.createInvitationTemplate(dto, user);
    }

    @Patch('invitation-templates/:id')
    @ApiOperation({ summary: 'Atualizar template de convite' })
    @ApiParam({ name: 'id', description: 'ID do template' })
    @ApiResponse({ status: 200, description: 'Template atualizado' })
    @ApiResponse({ status: 404, description: 'Template não encontrado' })
    @ApiResponse({ status: 400, description: 'Template padrão não pode ser editado' })
    async updateInvitationTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @Body() dto: UpdateInvitationTemplateDto,
        @CurrentUser() user: AuthUser,
    ) {
        return this.settingsService.updateInvitationTemplate(id, dto, user);
    }

    @Delete('invitation-templates/:id')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: 'Remover template de convite' })
    @ApiParam({ name: 'id', description: 'ID do template' })
    @ApiResponse({ status: 200, description: 'Template removido' })
    @ApiResponse({ status: 404, description: 'Template não encontrado' })
    @ApiResponse({ status: 400, description: 'Template padrão não pode ser removido' })
    async deleteInvitationTemplate(
        @Param('id', ParseUUIDPipe) id: string,
        @CurrentUser() user: AuthUser,
    ) {
        return this.settingsService.deleteInvitationTemplate(id, user);
    }
}
