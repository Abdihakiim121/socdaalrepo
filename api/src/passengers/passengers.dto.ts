import { Type } from 'class-transformer';
import { IsInt, IsString, Length, Max, Min } from 'class-validator';

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
