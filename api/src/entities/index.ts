import { Bus } from './bus.entity';
import { City } from './city.entity';
import { Passenger } from './passenger.entity';
import { Route } from './route.entity';
import { Station } from './station.entity';
import { Trip } from './trip.entity';
import { User } from './user.entity';

export * from './bus.entity';
export * from './city.entity';
export * from './passenger.entity';
export * from './route.entity';
export * from './station.entity';
export * from './trip.entity';
export * from './user.entity';

export const ENTITIES = [City, Station, Route, User, Bus, Trip, Passenger];
