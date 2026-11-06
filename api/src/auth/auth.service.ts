import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import { Repository } from 'typeorm';
import { User } from '../entities';
import { AuthUser } from './auth.types';

export const hashPin = (pin: string) => bcrypt.hash(pin, 10);

/** Keep phone numbers in one form so "+252 61 234 5678" and "612345678" match. */
export function normalizePhone(phone: string): string {
  let digits = phone.replace(/\D/g, '');
  if (digits.startsWith('252')) digits = digits.slice(3);
  if (digits.startsWith('0')) digits = digits.slice(1);
  return digits;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly jwt: JwtService,
  ) {}

  async login(phone: string, pin: string) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.pinHash')
      .leftJoinAndSelect('u.station', 's')
      .where('u.phone = :phone', { phone: normalizePhone(phone) })
      .getOne();

    if (!user || !user.active || !(await bcrypt.compare(pin, user.pinHash))) {
      throw new UnauthorizedException('Wrong phone number or PIN');
    }

    const payload: AuthUser = { sub: user.id, role: user.role, stationId: user.stationId };
    return {
      token: await this.jwt.signAsync(payload),
      user: { id: user.id, name: user.name, phone: user.phone, role: user.role, station: user.station },
    };
  }
}
