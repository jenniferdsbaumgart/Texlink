import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class SignContractDto {
  @ApiProperty({
    description: 'ID do contrato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  contractId: string;

  @ApiProperty({
    description: 'Confirmação de aceite dos termos',
    example: true,
  })
  @IsBoolean()
  accepted: boolean;

  @ApiProperty({
    description: 'Nome completo do assinante',
    example: 'João da Silva',
    maxLength: 255,
  })
  @IsString()
  @MaxLength(255)
  signerName: string;
}

// DTO simplificado para fluxo de onboarding (mantido para compatibilidade)
export class SignContractOnboardingDto {
  @ApiProperty({
    description: 'Confirmação de aceite dos termos',
    example: true,
  })
  @IsBoolean()
  accepted: boolean;
}
