import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsUUID,
  IsOptional,
  IsDateString,
  IsEnum,
  MaxLength,
} from 'class-validator';
import { ContractType } from '@prisma/client';

export class UploadContractDto {
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
    example: 'Contrato de Prestação de Serviços',
    maxLength: 255,
  })
  @IsString()
  @IsOptional()
  @MaxLength(255)
  title?: string;

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
    description: 'ID do contrato pai (para aditivos)',
    example: '550e8400-e29b-41d4-a716-446655440001',
  })
  @IsUUID()
  @IsOptional()
  parentContractId?: string;
}
