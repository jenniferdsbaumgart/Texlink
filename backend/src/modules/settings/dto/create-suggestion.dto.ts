import { IsString, IsEnum, MinLength, MaxLength } from 'class-validator';
import { SuggestionCategory } from '@prisma/client';

export class CreateSuggestionDto {
    @IsEnum(SuggestionCategory)
    category: SuggestionCategory;

    @IsString()
    @MinLength(5, { message: 'O título deve ter pelo menos 5 caracteres' })
    @MaxLength(200)
    title: string;

    @IsString()
    @MinLength(20, { message: 'A descrição deve ter pelo menos 20 caracteres' })
    @MaxLength(2000)
    description: string;
}
