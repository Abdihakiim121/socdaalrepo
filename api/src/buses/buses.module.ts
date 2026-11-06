import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Bus } from '../entities';
import { BusesController } from './buses.controller';
import { BusesService } from './buses.service';

@Module({
  imports: [TypeOrmModule.forFeature([Bus])],
  controllers: [BusesController],
  providers: [BusesService],
  exports: [BusesService],
})
export class BusesModule {}
