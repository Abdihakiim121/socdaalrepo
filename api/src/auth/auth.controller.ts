import { Body, Controller, Get, HttpCode, Post } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { LoginDto } from './auth.dto';
import { AuthService } from './auth.service';
import { AuthUser } from './auth.types';
import { CurrentUser, Public } from './decorators';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService, @InjectRepository(User) private readonly users: Repository<User>) {}

  @Public()
  @Post('login')
  @HttpCode(200)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto.phone, dto.pin);
  }

  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.users.findOne({ where: { id: user.sub }, relations: { station: { city: true } } });
  }
}
