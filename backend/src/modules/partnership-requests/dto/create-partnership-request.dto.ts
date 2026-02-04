import { IsNotEmpty, IsOptional, IsString, IsUUID, MaxLength } from 'class-validator';

export class CreatePartnershipRequestDto {
  @IsUUID()
  @IsNotEmpty()
  supplierId: string;

  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
