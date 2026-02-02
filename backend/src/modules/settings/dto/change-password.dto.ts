import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class ChangePasswordDto {
    @IsString()
    @MinLength(1)
    currentPassword: string;

    @IsString()
    @MinLength(8, { message: 'A nova senha deve ter pelo menos 8 caracteres' })
    @MaxLength(100)
    @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
        message: 'A senha deve conter pelo menos uma letra maiúscula, uma minúscula e um número',
    })
    newPassword: string;

    @IsString()
    @MinLength(8)
    confirmPassword: string;
}
