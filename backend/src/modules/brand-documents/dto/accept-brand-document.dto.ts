import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsBoolean,
  IsUUID,
  MaxLength,
} from 'class-validator';

export class AcceptBrandDocumentDto {
  @IsUUID()
  @IsNotEmpty()
  documentId: string;

  @IsUUID()
  @IsNotEmpty()
  relationshipId: string;

  @IsBoolean()
  @IsNotEmpty()
  checkboxConfirmed: boolean;

  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  acceptedByName: string;

  @IsString()
  @IsOptional()
  @MaxLength(100)
  acceptedByRole?: string;
}
