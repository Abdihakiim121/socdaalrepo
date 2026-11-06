import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { hashPin, normalizePhone } from '../auth/auth.service';
import { Station, User, UserRole } from '../entities';
import { CreateUserDto, UpdateUserDto } from './users.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private readonly users: Repository<User>,
    @InjectRepository(Station) private readonly stations: Repository<Station>,
  ) {}

  list(stationId?: number) {
    return this.users.find({
      where: stationId ? { stationId } : {},
      relations: { station: { city: true } },
      order: { name: 'ASC' },
    });
  }

  async create(dto: CreateUserDto) {
    const phone = normalizePhone(dto.phone);
    if (await this.users.exists({ where: { phone } })) {
      throw new ConflictException('A user with this phone number already exists');
    }
    const stationId = dto.role === UserRole.MANAGER ? dto.stationId! : null;
    if (stationId && !(await this.stations.exists({ where: { id: stationId } }))) {
      throw new BadRequestException('Boosteejo not found');
    }
    const user = this.users.create({
      name: dto.name,
      phone,
      role: dto.role,
      stationId,
      pinHash: await hashPin(dto.pin),
    });
    const saved = await this.users.save(user);
    return this.findOne(saved.id);
  }

  async update(id: number, dto: UpdateUserDto) {
    const user = await this.users.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    if (dto.phone) {
      const phone = normalizePhone(dto.phone);
      const taken = await this.users.findOne({ where: { phone } });
      if (taken && taken.id !== id) throw new ConflictException('A user with this phone number already exists');
      user.phone = phone;
    }
    if (dto.stationId !== undefined) {
      if (!(await this.stations.exists({ where: { id: dto.stationId } }))) {
        throw new BadRequestException('Boosteejo not found');
      }
      user.stationId = dto.stationId;
    }
    if (dto.name !== undefined) user.name = dto.name;
    if (dto.active !== undefined) user.active = dto.active;
    if (dto.pin) user.pinHash = await hashPin(dto.pin);

    await this.users.save(user);
    return this.findOne(id);
  }

  async findOne(id: number) {
    const user = await this.users.findOne({ where: { id }, relations: { station: { city: true } } });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }
}
