import { IsString, IsOptional, IsEmail, Matches, MaxLength, MinLength } from 'class-validator';

export class UpdateCompanyDataDto {
    @IsOptional()
    @IsString()
    @MinLength(2)
    @MaxLength(200)
    legalName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(200)
    tradeName?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    phone?: string;

    @IsOptional()
    @IsEmail()
    email?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    city?: string;

    @IsOptional()
    @IsString()
    @MaxLength(2)
    state?: string;

    // Address fields
    @IsOptional()
    @IsString()
    @MaxLength(200)
    street?: string;

    @IsOptional()
    @IsString()
    @MaxLength(20)
    number?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    complement?: string;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    neighborhood?: string;

    @IsOptional()
    @IsString()
    @Matches(/^\d{5}-?\d{3}$/, { message: 'CEP inválido. Use o formato 00000-000 ou 00000000' })
    zipCode?: string;
}
