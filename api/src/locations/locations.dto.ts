import { PartialType } from '@nestjs/mapped-types';
import { Type } from 'class-transformer';
import { IsBoolean, IsInt, IsLatitude, IsLongitude, IsOptional, IsString, Length } from 'class-validator';

export class CreateCityDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsOptional()
  @IsString()
  @Length(2, 100)
  region?: string;
}

export class UpdateCityDto extends PartialType(CreateCityDto) {}

export class CreateStationDto {
  @Type(() => Number)
  @IsInt()
  cityId: number;

  @IsString()
  @Length(2, 150)
  name: string;

  @IsOptional() @IsString() @Length(1, 100) district?: string;
  @IsOptional() @IsString() @Length(1, 200) landmark?: string;
  @IsOptional() @Type(() => Number) @IsLatitude() latitude?: number;
  @IsOptional() @Type(() => Number) @IsLongitude() longitude?: number;
  @IsOptional() @IsString() @Length(1, 100) contactName?: string;
  @IsOptional() @IsString() @Length(6, 30) contactPhone?: string;
  @IsOptional() @IsString() @Length(1, 100) openingHours?: string;
}

export class UpdateStationDto extends PartialType(CreateStationDto) {
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

export class CreateRouteDto {
  @Type(() => Number)
  @IsInt()
  destinationCityId: number;
}

export class UpdateRouteDto {
  @IsBoolean()
  active: boolean;
}

export class StationQueryDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  cityId?: number;

  /** Stage 2 search: boosteejos in cityId that serve this destination. */
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  destinationCityId?: number;
}
