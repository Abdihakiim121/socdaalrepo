import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';

export class CreateTripDto {
  @Type(() => Number)
  @IsInt()
  routeId: number;

  @Type(() => Number)
  @IsInt()
  busId: number;

  @IsOptional() @IsString() @Length(1, 100) driverName?: string;
  @IsOptional() @IsString() @Length(6, 30) driverPhone?: string;

  /** ISO date-time, e.g. 2026-11-07T06:00:00+03:00. Can be set later. */
  @IsOptional()
  @IsDateString()
  departureTime?: string;
}

export class UpdateTripDto {
  @IsOptional() @IsString() @Length(1, 100) driverName?: string;
  @IsOptional() @IsString() @Length(6, 30) driverPhone?: string;

  /** Send null to clear the departure time. */
  @IsOptional()
  @ValidateIf((o: UpdateTripDto) => o.departureTime !== null)
  @IsDateString()
  departureTime?: string | null;
}

export class MoveTripDto {
  @IsIn(['up', 'down'])
  direction: 'up' | 'down';
}

export class TripRecordsQueryDto {
  /** YYYY-MM-DD, Mogadishu time. */
  @IsOptional()
  @Matches(/^\d{4}-\d{2}-\d{2}$/, { message: 'date must look like 2026-11-07' })
  date?: string;

  @IsOptional() @Type(() => Number) @IsInt() routeId?: number;
  @IsOptional() @Type(() => Number) @IsInt() stationId?: number;
  @IsOptional() @IsString() plate?: string;
}
