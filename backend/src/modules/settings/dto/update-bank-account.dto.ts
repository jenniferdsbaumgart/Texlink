import { IsString, IsOptional, IsEnum, Matches, MaxLength, MinLength } from 'class-validator';
import { AccountType, PixKeyType } from '@prisma/client';

export class UpdateBankAccountDto {
    @IsString()
    @MinLength(3)
    @MaxLength(10)
    bankCode: string;

    @IsString()
    @MinLength(2)
    @MaxLength(100)
    bankName: string;

    @IsString()
    @MinLength(1)
    @MaxLength(10)
    agency: string;

    @IsString()
    @MinLength(1)
    @MaxLength(20)
    accountNumber: string;

    @IsEnum(AccountType)
    accountType: AccountType;

    @IsString()
    @MinLength(2)
    @MaxLength(200)
    accountHolder: string;

    @IsString()
    @Matches(/^\d{11}$|^\d{14}$/, { message: 'CPF deve ter 11 dígitos ou CNPJ deve ter 14 dígitos' })
    holderDocument: string;

    @IsOptional()
    @IsEnum(PixKeyType)
    pixKeyType?: PixKeyType;

    @IsOptional()
    @IsString()
    @MaxLength(100)
    pixKey?: string;
}
