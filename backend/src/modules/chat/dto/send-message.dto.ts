import {
  IsString,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  MaxLength,
  Min,
  Max,
} from 'class-validator';
import { MessageType } from '@prisma/client';

export class SendMessageDto {
  @IsEnum(MessageType)
  type: MessageType;

  @IsString()
  @IsOptional()
  @MaxLength(5000, { message: 'Mensagem muito longa (máximo 5000 caracteres)' })
  content?: string;

  // Proposal data (only for PROPOSAL type)
  @IsNumber()
  @IsOptional()
  @Min(0.01, { message: 'Preço deve ser maior que zero' })
  @Max(1000000, { message: 'Preço muito alto' })
  proposedPrice?: number;

  @IsNumber()
  @IsOptional()
  @Min(1, { message: 'Quantidade deve ser pelo menos 1' })
  @Max(1000000, { message: 'Quantidade muito alta' })
  proposedQuantity?: number;

  @IsDateString()
  @IsOptional()
  proposedDeadline?: string;
}
