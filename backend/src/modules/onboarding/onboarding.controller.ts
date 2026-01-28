import {
    Controller,
    Get,
    Post,
    Param,
    Body,
    HttpCode,
    HttpStatus,
} from '@nestjs/common';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
} from '@nestjs/swagger';
import { OnboardingService } from './onboarding.service';

/**
 * Controller público de Onboarding
 *
 * Endpoints sem autenticação para permitir acesso via token de convite
 */
@ApiTags('Onboarding Público')
@Controller('onboarding')
export class OnboardingController {
    constructor(private readonly onboardingService: OnboardingService) { }

    /**
     * Valida token de convite (endpoint público)
     *
     * Usado pela página de onboarding para verificar:
     * - Se o token é válido
     * - Se não expirou
     * - Dados da marca convidante
     * - Dados básicos do convite
     */
    @Get('validate-token/:token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Validar token de convite (público)',
        description:
            'Endpoint público para validar token de convite de credenciamento. ' +
            'Retorna informações da marca e status do convite.',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite (64 caracteres hex)',
        example: 'a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2',
    })
    @ApiResponse({
        status: 200,
        description: 'Token válido - retorna dados do convite',
        schema: {
            example: {
                valid: true,
                token: 'a1b2c3d4...',
                brand: {
                    name: 'Marca Exemplo',
                    logo: 'https://...',
                    location: 'São Paulo, SP',
                },
                supplier: {
                    cnpj: '12.345.678/0001-90',
                    tradeName: 'Facção Exemplo',
                    contactName: 'João Silva',
                    contactEmail: 'joao@example.com',
                },
                invitation: {
                    type: 'EMAIL',
                    sentAt: '2026-01-20T10:00:00Z',
                    expiresAt: '2026-01-27T10:00:00Z',
                    daysRemaining: 5,
                },
                status: 'INVITATION_SENT',
                hasOnboarding: false,
            },
        },
    })
    @ApiResponse({
        status: 404,
        description: 'Token não encontrado',
    })
    @ApiResponse({
        status: 400,
        description: 'Token expirado ou inativo',
    })
    async validateToken(@Param('token') token: string) {
        return this.onboardingService.validateToken(token);
    }

    /**
     * Inicia processo de onboarding (público)
     */
    @Post('start/:token')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({
        summary: 'Iniciar onboarding (público)',
        description:
            'Marca o início do processo de onboarding. ' +
            'Cria registro de progresso e atualiza status do credenciamento.',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite',
    })
    @ApiResponse({
        status: 200,
        description: 'Onboarding iniciado com sucesso',
    })
    async startOnboarding(
        @Param('token') token: string,
        @Body() body: { deviceInfo?: any },
    ) {
        return this.onboardingService.startOnboarding(token, body.deviceInfo);
    }

    /**
     * Retorna progresso do onboarding (público)
     */
    @Get('progress/:token')
    @ApiOperation({
        summary: 'Consultar progresso do onboarding (público)',
        description: 'Retorna o progresso atual do onboarding',
    })
    @ApiParam({
        name: 'token',
        description: 'Token único do convite',
    })
    async getProgress(@Param('token') token: string) {
        return this.onboardingService.getOnboardingProgress(token);
    }
}
