import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from './auth/auth.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { RolesGuard } from './auth/roles.guard';
import { BusesModule } from './buses/buses.module';
import { databaseOptions } from './config/database.config';
import { LiveModule } from './live/live.module';
import { LocationsModule } from './locations/locations.module';
import { PassengersModule } from './passengers/passengers.module';
import { TripsModule } from './trips/trips.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot(databaseOptions),
    AuthModule,
    LiveModule,
    LocationsModule,
    UsersModule,
    BusesModule,
    TripsModule,
    PassengersModule,
  ],
  providers: [
    // Every endpoint needs a login unless marked @Public(); roles are checked after.
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule {}
