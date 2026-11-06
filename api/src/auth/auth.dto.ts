import { IsString, Length, Matches } from 'class-validator';

export class LoginDto {
  @IsString()
  @Length(6, 30)
  phone: string;

  @Matches(/^\d{4,6}$/, { message: 'PIN must be 4 to 6 digits' })
  pin: string;
}
