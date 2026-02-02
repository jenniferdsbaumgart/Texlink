import { IsInt, IsOptional, IsArray, IsString, Min, Max } from 'class-validator';

export class UpdateCapacityDto {
    @IsOptional()
    @IsInt()
    @Min(0)
    monthlyCapacity?: number;

    @IsOptional()
    @IsInt()
    @Min(0)
    @Max(100)
    currentOccupancy?: number;

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    productTypes?: string[];

    @IsOptional()
    @IsArray()
    @IsString({ each: true })
    specialties?: string[];
}
