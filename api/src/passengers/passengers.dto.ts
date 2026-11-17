import { Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, Length, Matches, Max, Min } from 'class-validator';

export class CreatePassengerDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(6, 30)
  phone: string;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(20)
  seats: number = 1;
}

export class PassengerQueryDto {
  @IsOptional()
  @IsString()
  q?: string;

  /** YYYY-MM-DD, Mogadishu time. Ignored when q is given. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must look like 2026-11-17' })
  date?: string;

  @IsOptional() @Type(() => Number) @IsInt() stationId?: number;
  @IsOptional() @Type(() => Number) @IsInt() routeId?: number;
}
