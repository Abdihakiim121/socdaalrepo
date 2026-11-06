import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { Bus } from '../entities';
import { CreateBusDto, UpdateBusDto } from './buses.dto';

/** "bn  4127" and "BN 4127" are the same bus. */
export const normalizePlate = (plate: string) => plate.trim().toUpperCase().replace(/\s+/g, ' ');

@Injectable()
export class BusesService {
  constructor(@InjectRepository(Bus) private readonly buses: Repository<Bus>) {}

  search(plate?: string) {
    return this.buses.find({
      where: plate ? { plate: Like(`%${normalizePlate(plate)}%`) } : {},
      order: { plate: 'ASC' },
      take: 50,
    });
  }

  async create(dto: CreateBusDto) {
    const plate = normalizePlate(dto.plate);
    if (await this.buses.exists({ where: { plate } })) {
      throw new ConflictException(`Bus ${plate} is already registered`);
    }
    return this.buses.save(this.buses.create({ ...dto, plate }));
  }

  async update(id: number, dto: UpdateBusDto) {
    const bus = await this.findOne(id);
    return this.buses.save(Object.assign(bus, dto));
  }

  async findOne(id: number) {
    const bus = await this.buses.findOne({ where: { id } });
    if (!bus) throw new NotFoundException('Bus not found');
    return bus;
  }
}
