import { PartialType } from '@nestjs/mapped-types';
import { CreateEducationalContentDto } from './create-educational-content.dto';

export class UpdateEducationalContentDto extends PartialType(CreateEducationalContentDto) {}
