import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Passenger } from '../entities';
import { TripsModule } from '../trips/trips.module';
import { PassengersController } from './passengers.controller';
import { PassengersService } from './passengers.service';

@Module({
  imports: [TypeOrmModule.forFeature([Passenger]), TripsModule],
  controllers: [PassengersController],
  providers: [PassengersService],
})
export class PassengersModule {}
