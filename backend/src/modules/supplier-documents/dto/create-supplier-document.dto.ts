import {
  IsString,
  IsOptional,
  IsEnum,
  IsDateString,
  IsInt,
  Min,
  Max,
} from 'class-validator';
import { SupplierDocumentType } from '@prisma/client';

export class CreateSupplierDocumentDto {
  @IsEnum(SupplierDocumentType)
  type: SupplierDocumentType;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(12)
  competenceMonth?: number;

  @IsOptional()
  @IsInt()
  @Min(2000)
  @Max(2100)
  competenceYear?: number;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  @IsString()
  notes?: string;
}
