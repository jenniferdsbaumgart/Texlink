import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class RespondPartnershipRequestDto {
  @IsBoolean()
  @IsNotEmpty()
  accepted: boolean;

  @IsString()
  @IsOptional()
  @MaxLength(500)
  rejectionReason?: string;

  /**
   * LGPD consent for document sharing with the brand.
   * When true, the supplier agrees to share compliance documents with this brand.
   */
  @IsBoolean()
  @IsOptional()
  documentSharingConsent?: boolean;
}
