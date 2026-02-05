import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsUUID, MinLength, MaxLength } from 'class-validator';

export class RequestRevisionDto {
  @ApiProperty({
    description: 'ID do contrato',
    example: '550e8400-e29b-41d4-a716-446655440000',
  })
  @IsUUID()
  contractId: string;

  @ApiProperty({
    description: 'Mensagem explicando a solicitação de revisão',
    example:
      'Gostaríamos de revisar a cláusula 5 sobre prazos de entrega. Precisamos de 15 dias adicionais.',
    minLength: 10,
    maxLength: 2000,
  })
  @IsString()
  @MinLength(10)
  @MaxLength(2000)
  message: string;
}
