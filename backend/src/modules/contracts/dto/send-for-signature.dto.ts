import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsOptional, MaxLength } from 'class-validator';

export class SendForSignatureDto {
  @ApiProperty({
    description: 'ID do contrato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  contractId: string;

  @ApiPropertyOptional({
    description: 'Mensagem opcional para o destinatário',
    example: 'Por favor, revise e assine o contrato até sexta-feira.',
    maxLength: 1000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(1000)
  message?: string;
}
