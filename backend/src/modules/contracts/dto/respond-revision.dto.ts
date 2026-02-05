import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsUUID, IsEnum, IsOptional, MaxLength } from 'class-validator';
import { ContractRevisionStatus } from '@prisma/client';

enum RevisionResponseStatus {
  ACCEPTED = 'ACCEPTED',
  REJECTED = 'REJECTED',
}

export class RespondRevisionDto {
  @ApiProperty({
    description: 'ID da solicitação de revisão',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  revisionId: string;

  @ApiProperty({
    description: 'Status da resposta (ACCEPTED ou REJECTED)',
    enum: RevisionResponseStatus,
    example: 'ACCEPTED',
  })
  @IsEnum(RevisionResponseStatus)
  status: 'ACCEPTED' | 'REJECTED';

  @ApiPropertyOptional({
    description: 'Notas sobre a resposta',
    example: 'Alteramos a cláusula 5 conforme solicitado. Por favor, revise novamente.',
    maxLength: 2000,
  })
  @IsString()
  @IsOptional()
  @MaxLength(2000)
  responseNotes?: string;
}
