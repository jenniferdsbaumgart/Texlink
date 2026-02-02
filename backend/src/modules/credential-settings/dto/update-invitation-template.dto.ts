import { PartialType } from '@nestjs/swagger';
import { CreateInvitationTemplateDto } from './create-invitation-template.dto';

/**
 * DTO para atualização de template de convite
 * Todos os campos são opcionais
 */
export class UpdateInvitationTemplateDto extends PartialType(
  CreateInvitationTemplateDto,
) {}
