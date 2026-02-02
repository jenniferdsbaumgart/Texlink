import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsEnum,
  IsOptional,
  Length,
  MaxLength,
} from 'class-validator';
import { InvitationType } from '@prisma/client';

/**
 * DTO para criação de template de convite
 */
export class CreateInvitationTemplateDto {
  @ApiProperty({
    description: 'Nome do template',
    example: 'Convite Padrão',
    minLength: 2,
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty({ message: 'Nome é obrigatório' })
  @Length(2, 100, {
    message: 'Nome deve ter entre 2 e 100 caracteres',
  })
  name: string;

  @ApiProperty({
    description: 'Tipo do convite',
    enum: InvitationType,
    example: InvitationType.EMAIL,
  })
  @IsEnum(InvitationType, {
    message: 'Tipo deve ser EMAIL, WHATSAPP, SMS ou LINK',
  })
  type: InvitationType;

  @ApiPropertyOptional({
    description: 'Assunto (para emails)',
    example: 'Convite para parceria - {{brand_name}}',
    maxLength: 200,
  })
  @IsOptional()
  @IsString()
  @MaxLength(200, { message: 'Assunto deve ter no máximo 200 caracteres' })
  subject?: string;

  @ApiProperty({
    description: 'Conteúdo do template (suporta variáveis)',
    example: `Olá {{contact_name}},

A {{brand_name}} gostaria de convidá-lo para fazer parte da nossa rede de fornecedores.

Clique no link abaixo para iniciar seu cadastro:
{{link}}

Atenciosamente,
Equipe {{brand_name}}`,
  })
  @IsString()
  @IsNotEmpty({ message: 'Conteúdo é obrigatório' })
  @Length(10, 5000, {
    message: 'Conteúdo deve ter entre 10 e 5000 caracteres',
  })
  content: string;
}
