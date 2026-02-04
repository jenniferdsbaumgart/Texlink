import { IsEnum, IsOptional, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { PartnershipRequestStatus } from '@prisma/client';

export class PartnershipRequestFilterDto {
  @IsEnum(PartnershipRequestStatus)
  @IsOptional()
  status?: PartnershipRequestStatus;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number = 1;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  @IsOptional()
  limit?: number = 10;
}
