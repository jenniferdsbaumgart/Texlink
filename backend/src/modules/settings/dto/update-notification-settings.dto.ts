import { IsBoolean, IsOptional } from 'class-validator';

export class UpdateNotificationSettingsDto {
  @IsOptional()
  @IsBoolean()
  emailEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  whatsappEnabled?: boolean;

  @IsOptional()
  @IsBoolean()
  newOrdersEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  newOrdersWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  messagesWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsEmail?: boolean;

  @IsOptional()
  @IsBoolean()
  paymentsWhatsapp?: boolean;

  @IsOptional()
  @IsBoolean()
  deadlineReminders?: boolean;

  @IsOptional()
  @IsBoolean()
  systemUpdates?: boolean;
}
