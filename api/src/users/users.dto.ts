import { Type } from 'class-transformer';
import { IsBoolean, IsEnum, IsInt, IsOptional, IsString, Length, Matches, ValidateIf } from 'class-validator';
import { UserRole } from '../entities';

export class CreateUserDto {
  @IsString()
  @Length(2, 100)
  name: string;

  @IsString()
  @Length(6, 30)
  phone: string;

  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin: string;

  @IsEnum(UserRole)
  role: UserRole;

  /** Required for managers: the boosteejo they work at. */
  @ValidateIf((o: CreateUserDto) => o.role === UserRole.MANAGER)
  @Type(() => Number)
  @IsInt()
  stationId?: number;
}

export class UpdateUserDto {
  @IsOptional() @IsString() @Length(2, 100) name?: string;
  @IsOptional() @IsString() @Length(6, 30) phone?: string;
  @IsOptional() @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' }) pin?: string;
  @IsOptional() @Type(() => Number) @IsInt() stationId?: number;
  @IsOptional() @IsBoolean() active?: boolean;
}
