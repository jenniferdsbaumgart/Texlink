import { ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsOptional,
    IsEnum,
    IsDateString,
    IsInt,
    Min,
    Max,
} from 'class-validator';
import { Transform, Type } from 'class-transformer';
import { SupplierCredentialStatus } from '@prisma/client';

/**
 * Ordenação possível
 */
export enum CredentialSortBy {
    CREATED_AT = 'createdAt',
    UPDATED_AT = 'updatedAt',
    TRADE_NAME = 'tradeName',
    STATUS = 'status',
    PRIORITY = 'priority',
}

export enum SortOrder {
    ASC = 'asc',
    DESC = 'desc',
}

/**
 * DTO para filtros e paginação de credenciamentos
 */
export class CredentialFiltersDto {
    @ApiPropertyOptional({
        description: 'Busca por CNPJ, nome fantasia, razão social ou código interno',
        example: 'confecções',
    })
    @IsOptional()
    @IsString()
    @Transform(({ value }) => value?.trim())
    search?: string;

    @ApiPropertyOptional({
        description: 'Filtrar por status do credenciamento',
        enum: SupplierCredentialStatus,
        example: SupplierCredentialStatus.PENDING_VALIDATION,
    })
    @IsOptional()
    @IsEnum(SupplierCredentialStatus, {
        message: 'Status inválido',
    })
    status?: SupplierCredentialStatus;

    @ApiPropertyOptional({
        description: 'Filtrar por múltiplos status',
        type: [String],
        example: ['DRAFT', 'PENDING_VALIDATION'],
    })
    @IsOptional()
    @Transform(({ value }) => {
        if (typeof value === 'string') return value.split(',');
        return value;
    })
    @IsEnum(SupplierCredentialStatus, {
        each: true,
        message: 'Status inválido',
    })
    statuses?: SupplierCredentialStatus[];

    @ApiPropertyOptional({
        description: 'Filtrar por categoria',
        example: 'Jeans',
    })
    @IsOptional()
    @IsString()
    category?: string;

    @ApiPropertyOptional({
        description: 'Data inicial de criação (ISO 8601)',
        example: '2024-01-01',
    })
    @IsOptional()
    @IsDateString({}, { message: 'Data inicial inválida' })
    createdFrom?: string;

    @ApiPropertyOptional({
        description: 'Data final de criação (ISO 8601)',
        example: '2024-12-31',
    })
    @IsOptional()
    @IsDateString({}, { message: 'Data final inválida' })
    createdTo?: string;

    @ApiPropertyOptional({
        description: 'Número da página (começa em 1)',
        example: 1,
        default: 1,
        minimum: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Página deve ser um número inteiro' })
    @Min(1, { message: 'Página mínima é 1' })
    page?: number = 1;

    @ApiPropertyOptional({
        description: 'Quantidade de itens por página',
        example: 20,
        default: 20,
        minimum: 1,
        maximum: 100,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt({ message: 'Limite deve ser um número inteiro' })
    @Min(1, { message: 'Limite mínimo é 1' })
    @Max(100, { message: 'Limite máximo é 100' })
    limit?: number = 20;

    @ApiPropertyOptional({
        description: 'Campo para ordenação',
        enum: CredentialSortBy,
        default: CredentialSortBy.CREATED_AT,
    })
    @IsOptional()
    @IsEnum(CredentialSortBy, {
        message: 'Campo de ordenação inválido',
    })
    sortBy?: CredentialSortBy = CredentialSortBy.CREATED_AT;

    @ApiPropertyOptional({
        description: 'Direção da ordenação',
        enum: SortOrder,
        default: SortOrder.DESC,
    })
    @IsOptional()
    @IsEnum(SortOrder, {
        message: 'Ordem deve ser asc ou desc',
    })
    sortOrder?: SortOrder = SortOrder.DESC;
}

/**
 * Resposta paginada de credenciamentos
 */
export class PaginatedCredentialsResponseDto {
    @ApiPropertyOptional({ description: 'Lista de credenciamentos' })
    data: any[]; // Será tipado como SupplierCredential[]

    @ApiPropertyOptional({ description: 'Metadados de paginação' })
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    };
}
