import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsArray,
  IsUUID,
  ArrayMinSize,
  Length,
} from 'class-validator';

/**
 * Canal de envio do convite
 */
export enum InvitationChannel {
  EMAIL = 'EMAIL',
  WHATSAPP = 'WHATSAPP',
  BOTH = 'BOTH',
}

/**
 * DTO para envio de convite individual
 */
export class SendInvitationDto {
  @ApiProperty({
    description: 'Canal de envio do convite',
    enum: InvitationChannel,
    example: InvitationChannel.EMAIL,
  })
  @IsEnum(InvitationChannel, {
    message: 'Canal deve ser EMAIL, WHATSAPP ou BOTH',
  })
  @IsNotEmpty({ message: 'Canal é obrigatório' })
  channel: InvitationChannel;

  @ApiPropertyOptional({
    description: 'Mensagem personalizada para o convite',
    example: 'Olá! Gostaríamos de convidá-lo para ser nosso parceiro.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, {
    message: 'Mensagem deve ter no máximo 500 caracteres',
  })
  customMessage?: string;

  @ApiPropertyOptional({
    description: 'ID do template de convite a ser usado',
    example: 'template-uuid-aqui',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do template deve ser um UUID válido' })
  templateId?: string;
}

/**
 * DTO para envio de convites em lote
 */
export class BulkSendInvitationDto {
  @ApiProperty({
    description: 'Lista de IDs dos credenciamentos para enviar convite',
    example: ['uuid-1', 'uuid-2', 'uuid-3'],
    type: [String],
  })
  @IsArray({ message: 'credentialIds deve ser um array' })
  @ArrayMinSize(1, {
    message: 'Pelo menos um credenciamento deve ser selecionado',
  })
  @IsUUID('4', { each: true, message: 'Cada ID deve ser um UUID válido' })
  credentialIds: string[];

  @ApiProperty({
    description: 'Canal de envio do convite',
    enum: InvitationChannel,
    example: InvitationChannel.EMAIL,
  })
  @IsEnum(InvitationChannel, {
    message: 'Canal deve ser EMAIL, WHATSAPP ou BOTH',
  })
  @IsNotEmpty({ message: 'Canal é obrigatório' })
  channel: InvitationChannel;

  @ApiPropertyOptional({
    description: 'Mensagem personalizada para todos os convites',
    example: 'Olá! Gostaríamos de convidá-lo para ser nosso parceiro.',
    maxLength: 500,
  })
  @IsOptional()
  @IsString()
  @Length(0, 500, {
    message: 'Mensagem deve ter no máximo 500 caracteres',
  })
  customMessage?: string;

  @ApiPropertyOptional({
    description: 'ID do template de convite a ser usado',
    example: 'template-uuid-aqui',
  })
  @IsOptional()
  @IsUUID('4', { message: 'ID do template deve ser um UUID válido' })
  templateId?: string;
}

/**
 * Resultado do envio de convite em lote
 */
export class BulkInvitationResultDto {
  @ApiProperty({ description: 'IDs enviados com sucesso' })
  successful: string[];

  @ApiProperty({ description: 'IDs que falharam com mensagens de erro' })
  failed: { id: string; error: string }[];

  @ApiProperty({ description: 'Total de convites enviados' })
  totalSent: number;

  @ApiProperty({ description: 'Total de falhas' })
  totalFailed: number;
}
