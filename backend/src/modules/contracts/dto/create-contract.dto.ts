import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsNumber,
  IsEnum,
  IsObject,
  Min,
  MaxLength,
} from 'class-validator';
import { ContractType } from '@prisma/client';

export class CreateContractDto {
  @ApiProperty({
    description: 'ID do relacionamento marca-facção',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  relationshipId: string;

  @ApiProperty({
    description: 'Tipo do contrato',
    enum: ContractType,
    example: ContractType.SERVICE_AGREEMENT,
  })
  @IsEnum(ContractType)
  type: ContractType;

  @ApiPropertyOptional({
    description: 'Título do contrato',
    example: 'Contrato de Prestação de Serviços de Facção',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

  @ApiPropertyOptional({
    description: 'Descrição do contrato',
    example: 'Contrato para produção de 5000 peças mensais',
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiPropertyOptional({
    description: 'Valor do contrato (em reais)',
    example: 50000.0,
    minimum: 0,
  })
  @IsNumber()
  @IsOptional()
  @Min(0)
  value?: number;

  @ApiProperty({
    description: 'Data de início de vigência',
    example: '2026-03-01',
  })
  @IsDateString()
  validFrom: string;

  @ApiProperty({
    description: 'Data de fim de vigência',
    example: '2027-02-28',
  })
  @IsDateString()
  validUntil: string;

  @ApiPropertyOptional({
    description: 'Termos específicos do contrato',
    example: { paymentTerms: '30 dias', penaltyRate: '0.5%' },
  })
  @IsObject()
  @IsOptional()
  terms?: Record<string, any>;

  @ApiPropertyOptional({
    description: 'ID do contrato pai (para aditivos)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  parentContractId?: string;
}
