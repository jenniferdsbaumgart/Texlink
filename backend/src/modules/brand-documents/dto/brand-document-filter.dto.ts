import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';
import { BrandDocumentType, BrandDocumentStatus } from '@prisma/client';

export class BrandDocumentFilterDto {
  @IsEnum(BrandDocumentType)
  @IsOptional()
  type?: BrandDocumentType;

  @IsEnum(BrandDocumentStatus)
  @IsOptional()
  status?: BrandDocumentStatus;

  @IsInt()
  @Min(1)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  page?: number = 1;

  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  @Transform(({ value }) => parseInt(value, 10))
  limit?: number = 10;
}
