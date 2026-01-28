import {
    Injectable,
    Logger,
    NotFoundException,
    BadRequestException,
    ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InvitationType } from '@prisma/client';
import {
    CreateInvitationTemplateDto,
    UpdateInvitationTemplateDto,
} from './dto';

interface AuthUser {
    id: string;
    companyId: string;
    brandId?: string;
}

/**
 * Serviço para gerenciar configurações de credenciamento e templates
 */
@Injectable()
export class CredentialSettingsService {
    private readonly logger = new Logger(CredentialSettingsService.name);

    constructor(private readonly prisma: PrismaService) {}

    // ==================== INVITATION TEMPLATES ====================

    /**
     * Lista todos os templates de convite da marca
     */
    async getInvitationTemplates(companyId: string) {
        return this.prisma.invitationTemplate.findMany({
            where: { companyId },
            orderBy: [
                { isDefault: 'desc' }, // Templates padrão primeiro
                { name: 'asc' },
            ],
        });
    }

    /**
     * Busca template de convite por ID
     */
    async getInvitationTemplate(id: string, companyId: string) {
        const template = await this.prisma.invitationTemplate.findUnique({
            where: { id },
        });

        if (!template) {
            throw new NotFoundException(`Template ${id} não encontrado`);
        }

        if (template.companyId !== companyId) {
            throw new NotFoundException('Template não encontrado');
        }

        return template;
    }

    /**
     * Cria novo template de convite
     */
    async createInvitationTemplate(
        dto: CreateInvitationTemplateDto,
        user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;

        // Verifica se já existe template com mesmo nome
        const existing = await this.prisma.invitationTemplate.findFirst({
            where: {
                companyId,
                name: dto.name,
            },
        });

        if (existing) {
            throw new ConflictException(
                `Já existe um template com o nome "${dto.name}"`,
            );
        }

        // Valida variáveis do template
        this.validateTemplateVariables(dto.content);

        this.logger.log(
            `Criando template de convite "${dto.name}" para marca ${companyId}`,
        );

        return this.prisma.invitationTemplate.create({
            data: {
                companyId,
                name: dto.name,
                type: dto.type,
                subject: dto.subject,
                content: dto.content,
                isDefault: false,
                isActive: true,
            },
        });
    }

    /**
     * Atualiza template de convite existente
     */
    async updateInvitationTemplate(
        id: string,
        dto: UpdateInvitationTemplateDto,
        user: AuthUser,
    ) {
        const companyId = user.brandId || user.companyId;

        // Busca e valida template
        const template = await this.getInvitationTemplate(id, companyId);

        // Não permite editar template padrão (pode criar cópia)
        if (template.isDefault) {
            throw new BadRequestException(
                'Não é possível editar o template padrão. Crie uma cópia para customizar.',
            );
        }

        // Se está alterando o nome, valida duplicidade
        if (dto.name && dto.name !== template.name) {
            const existing = await this.prisma.invitationTemplate.findFirst({
                where: {
                    companyId,
                    name: dto.name,
                    id: { not: id },
                },
            });

            if (existing) {
                throw new ConflictException(
                    `Já existe um template com o nome "${dto.name}"`,
                );
            }
        }

        // Valida variáveis se está alterando conteúdo
        if (dto.content) {
            this.validateTemplateVariables(dto.content);
        }

        this.logger.log(`Atualizando template ${id}`);

        return this.prisma.invitationTemplate.update({
            where: { id },
            data: {
                name: dto.name,
                type: dto.type,
                subject: dto.subject,
                content: dto.content,
            },
        });
    }

    /**
     * Remove template de convite
     */
    async deleteInvitationTemplate(id: string, user: AuthUser) {
        const companyId = user.brandId || user.companyId;

        // Busca e valida template
        const template = await this.getInvitationTemplate(id, companyId);

        // Não permite remover template padrão
        if (template.isDefault) {
            throw new BadRequestException(
                'Não é possível remover o template padrão',
            );
        }

        this.logger.log(`Removendo template ${id}`);

        await this.prisma.invitationTemplate.delete({
            where: { id },
        });

        return {
            success: true,
            message: 'Template removido com sucesso',
        };
    }

    /**
     * Substitui variáveis do template com dados reais
     */
    replaceTemplateVariables(
        template: string,
        variables: {
            brand_name: string;
            contact_name: string;
            company_name?: string;
            link: string;
            [key: string]: string | undefined;
        },
    ): string {
        let result = template;

        Object.keys(variables).forEach((key) => {
            const placeholder = `{{${key}}}`;
            const value = variables[key] || '';
            result = result.replace(new RegExp(placeholder, 'g'), value);
        });

        return result;
    }

    /**
     * Valida se template contém apenas variáveis permitidas
     */
    private validateTemplateVariables(content: string) {
        const allowedVariables = [
            'brand_name',
            'contact_name',
            'company_name',
            'link',
            'cnpj',
        ];

        // Extrai todas as variáveis do template
        const variableRegex = /\{\{(\w+)\}\}/g;
        const matches = content.match(variableRegex);

        if (!matches) {
            return; // Nenhuma variável, OK
        }

        // Verifica se todas são permitidas
        const invalidVariables: string[] = [];

        matches.forEach((match) => {
            const variable = match.replace(/\{\{|\}\}/g, '');
            if (!allowedVariables.includes(variable)) {
                invalidVariables.push(variable);
            }
        });

        if (invalidVariables.length > 0) {
            throw new BadRequestException(
                `Variáveis inválidas no template: ${invalidVariables.join(', ')}. ` +
                    `Variáveis permitidas: ${allowedVariables.join(', ')}`,
            );
        }
    }

    /**
     * Busca ou cria template padrão da marca
     */
    async getOrCreateDefaultTemplate(companyId: string) {
        // Busca template padrão existente
        const existing = await this.prisma.invitationTemplate.findFirst({
            where: {
                companyId,
                isDefault: true,
            },
        });

        if (existing) {
            return existing;
        }

        // Cria template padrão
        this.logger.log(`Criando template padrão para marca ${companyId}`);

        return this.prisma.invitationTemplate.create({
            data: {
                companyId,
                name: 'Template Padrão',
                type: InvitationType.EMAIL,
                subject: 'Convite para Credenciamento - {{brand_name}}',
                content: `Olá {{contact_name}},

A {{brand_name}} tem interesse em credenciá-lo como fornecedor em nossa plataforma.

Para iniciar o processo de cadastro, clique no link abaixo:
{{link}}

Este convite é válido por 7 dias.

Em caso de dúvidas, entre em contato conosco.

Atenciosamente,
Equipe {{brand_name}}`,
                isDefault: true,
                isActive: true,
            },
        });
    }
}
