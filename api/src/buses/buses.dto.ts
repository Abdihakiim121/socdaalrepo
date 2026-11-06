import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Max, Min } from 'class-validator';

export class CreateBusDto {
  @IsString()
  @Length(2, 30)
  plate: string;

  @IsOptional() @IsString() @Length(1, 60) type?: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  seatCount: number;

  @IsOptional() @IsString() @Length(1, 100) ownerName?: string;
  @IsOptional() @IsString() @Length(6, 30) ownerPhone?: string;
}

export class UpdateBusDto {
  @IsOptional() @IsString() @Length(1, 60) type?: string;
  @IsOptional() @Type(() => Number) @IsInt() @Min(1) @Max(100) seatCount?: number;
  @IsOptional() @IsString() @Length(1, 100) ownerName?: string;
  @IsOptional() @IsString() @Length(6, 30) ownerPhone?: string;
}
