import { PartialType } from '@nestjs/swagger';
import { CreateCredentialDto } from './create-credential.dto';

/**
 * DTO para atualização de um credenciamento existente
 * Todos os campos são opcionais (PartialType)
 */
export class UpdateCredentialDto extends PartialType(CreateCredentialDto) { }
