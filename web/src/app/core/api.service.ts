import { HttpClient, HttpErrorResponse, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import {
  Bus,
  City,
  LoginResponse,
  Passenger,
  QueueResponse,
  Route,
  Station,
  TodayResponse,
  Trip,
  User,
  UserRole,
} from './api.types';

/** Turns a NestJS error into one line to show the manager. */
export function errorText(err: unknown): string {
  if (err instanceof HttpErrorResponse) {
    if (err.status === 0) return 'Cannot reach the server. Check the internet connection.';
    const message = err.error?.message;
    if (Array.isArray(message)) return message.join('. ');
    if (typeof message === 'string') return message;
  }
  return 'Something went wrong. Please try again.';
}

function params(values: Record<string, string | number | null | undefined>): HttpParams {
  let p = new HttpParams();
  for (const [key, value] of Object.entries(values)) {
    if (value !== null && value !== undefined && value !== '') p = p.set(key, String(value));
  }
  return p;
}

/** One method per API endpoint (see api/README.md). */
@Injectable({ providedIn: 'root' })
export class ApiService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiUrl}/api`;

  // Auth
  login(phone: string, pin: string) {
    return this.http.post<LoginResponse>(`${this.base}/auth/login`, { phone, pin });
  }
  me() {
    return this.http.get<User>(`${this.base}/auth/me`);
  }

  // Cities, boosteejos and routes
  cities() {
    return this.http.get<City[]>(`${this.base}/cities`);
  }
  createCity(body: { name: string; region?: string }) {
    return this.http.post<City>(`${this.base}/cities`, body);
  }
  stations(cityId?: number) {
    return this.http.get<Station[]>(`${this.base}/stations`, { params: params({ cityId }) });
  }
  station(id: number) {
    return this.http.get<Station>(`${this.base}/stations/${id}`);
  }
  createStation(body: Partial<Station> & { cityId: number; name: string }) {
    return this.http.post<Station>(`${this.base}/stations`, body);
  }
  updateStation(id: number, body: Partial<Station>) {
    return this.http.patch<Station>(`${this.base}/stations/${id}`, body);
  }
  routes(stationId: number) {
    return this.http.get<Route[]>(`${this.base}/stations/${stationId}/routes`);
  }
  createRoute(stationId: number, destinationCityId: number) {
    return this.http.post<Route>(`${this.base}/stations/${stationId}/routes`, { destinationCityId });
  }
  setRouteActive(id: number, active: boolean) {
    return this.http.patch<Route>(`${this.base}/routes/${id}`, { active });
  }
  today(stationId: number) {
    return this.http.get<TodayResponse>(`${this.base}/stations/${stationId}/today`);
  }

  // Managers
  users(stationId?: number) {
    return this.http.get<User[]>(`${this.base}/users`, { params: params({ stationId }) });
  }
  createUser(body: { name: string; phone: string; pin: string; role: UserRole; stationId?: number }) {
    return this.http.post<User>(`${this.base}/users`, body);
  }
  updateUser(id: number, body: { name?: string; phone?: string; pin?: string; stationId?: number; active?: boolean }) {
    return this.http.patch<User>(`${this.base}/users/${id}`, body);
  }

  // Buses
  searchBuses(plate: string) {
    return this.http.get<Bus[]>(`${this.base}/buses`, { params: params({ plate }) });
  }
  createBus(body: { plate: string; seatCount: number; type?: string; ownerName?: string; ownerPhone?: string }) {
    return this.http.post<Bus>(`${this.base}/buses`, body);
  }

  // Queue and trips
  queue(routeId: number) {
    return this.http.get<QueueResponse>(`${this.base}/routes/${routeId}/queue`);
  }
  createTrip(body: { routeId: number; busId: number; driverName?: string; driverPhone?: string; departureTime?: string }) {
    return this.http.post<Trip>(`${this.base}/trips`, body);
  }
  trip(id: number) {
    return this.http.get<Trip>(`${this.base}/trips/${id}`);
  }
  updateTrip(id: number, body: { driverName?: string; driverPhone?: string; departureTime?: string | null }) {
    return this.http.patch<Trip>(`${this.base}/trips/${id}`, body);
  }
  moveTrip(id: number, direction: 'up' | 'down') {
    return this.http.post<QueueResponse>(`${this.base}/trips/${id}/move`, { direction });
  }
  departTrip(id: number) {
    return this.http.post<Trip>(`${this.base}/trips/${id}/depart`, {});
  }
  cancelTrip(id: number) {
    return this.http.post<Trip>(`${this.base}/trips/${id}/cancel`, {});
  }
  records(filter: { date?: string; routeId?: number; plate?: string; stationId?: number }) {
    return this.http.get<Trip[]>(`${this.base}/trips`, { params: params(filter) });
  }

  // Passengers
  passengers(tripId: number) {
    return this.http.get<Passenger[]>(`${this.base}/trips/${tripId}/passengers`);
  }
  addPassenger(tripId: number, body: { name: string; phone: string; seats: number }) {
    return this.http.post<Passenger>(`${this.base}/trips/${tripId}/passengers`, body);
  }
  cancelPassenger(id: number) {
    return this.http.post<Passenger>(`${this.base}/passengers/${id}/cancel`, {});
  }
  searchPassengers(q: string) {
    return this.http.get<Passenger[]>(`${this.base}/passengers`, { params: params({ q }) });
  }
}
