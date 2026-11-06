// Shapes returned by the API in ../../../../api. Keep in step with the entities there.

export type UserRole = 'admin' | 'manager';
export type TripStatus = 'waiting' | 'boarding' | 'departed' | 'cancelled';
export type PassengerStatus = 'active' | 'cancelled';

export interface City {
  id: number;
  name: string;
  region: string | null;
}

export interface Route {
  id: number;
  stationId: number;
  destinationCityId: number;
  active: boolean;
  destinationCity?: City;
  station?: Station;
}

export interface Station {
  id: number;
  cityId: number;
  name: string;
  district: string | null;
  landmark: string | null;
  latitude: number | null;
  longitude: number | null;
  contactName: string | null;
  contactPhone: string | null;
  openingHours: string | null;
  active: boolean;
  city?: City;
  routes?: Route[];
}

export interface User {
  id: number;
  name: string;
  phone: string;
  role: UserRole;
  stationId: number | null;
  active?: boolean;
  station?: Station | null;
}

export interface Bus {
  id: number;
  plate: string;
  type: string | null;
  seatCount: number;
  ownerName: string | null;
  ownerPhone: string | null;
}

export interface Trip {
  id: number;
  routeId: number;
  busId: number;
  driverName: string | null;
  driverPhone: string | null;
  queuePosition: number | null;
  arrivedAt: string;
  departureTime: string | null;
  status: TripStatus;
  departedAt: string | null;
  bus: Bus;
  route?: Route;
  seatsBooked: number;
  seatsLeft: number;
}

export interface Passenger {
  id: number;
  tripId: number;
  name: string;
  phone: string;
  seats: number;
  status: PassengerStatus;
  createdAt: string;
  trip?: Trip;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export interface QueueResponse {
  route: Route;
  trips: Trip[];
}

export interface TodayResponse {
  station: { id: number; name: string; city: string };
  date: string;
  totals: { busesInQueue: number; departedToday: number; passengersToday: number };
  routes: { routeId: number; destination: string; busesInQueue: number; departedToday: number; passengersToday: number }[];
}
