import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BusesModule } from '../buses/buses.module';
import { Trip } from '../entities';
import { LocationsModule } from '../locations/locations.module';
import { TripsController } from './trips.controller';
import { TripsService } from './trips.service';

@Module({
  imports: [TypeOrmModule.forFeature([Trip]), LocationsModule, BusesModule],
  controllers: [TripsController],
  providers: [TripsService],
  exports: [TripsService],
})
export class TripsModule {}
