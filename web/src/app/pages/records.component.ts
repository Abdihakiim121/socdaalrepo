import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Passenger, Trip } from '../core/api.types';
import { TextKey, TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';
import { MOGADISHU_TZ, mogadishuToday } from '../core/time';

/** Search past trips by date, route or plate, and passengers by name or phone. */
@Component({
  selector: 'app-records',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>{{ 'records' | t }}</h1>
        <div class="row" role="tablist">
          <button type="button" role="tab" class="pill" [class.active]="tab() === 'trips'" [attr.aria-selected]="tab() === 'trips'" (click)="tab.set('trips')">{{ 'trips' | t }}</button>
          <button type="button" role="tab" class="pill" [class.active]="tab() === 'passengers'" [attr.aria-selected]="tab() === 'passengers'" (click)="tab.set('passengers')">{{ 'passengers' | t }}</button>
        </div>
      </div>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (tab() === 'trips') {
        <form class="card form-grid" (ngSubmit)="searchTrips()">
          <div class="field">
            <label for="rdate">{{ 'date' | t }}</label>
            <input id="rdate" name="rdate" type="date" [(ngModel)]="date">
          </div>
          <div class="field">
            <label for="rroute">{{ 'route' | t }}</label>
            <select id="rroute" name="rroute" [(ngModel)]="routeId">
              <option [ngValue]="null">—</option>
              @for (r of routes(); track r.id) {
                <option [ngValue]="r.id">→ {{ r.destinationCity?.name }}</option>
              }
            </select>
          </div>
          <div class="field">
            <label for="rplate">{{ 'plate' | t }}</label>
            <input id="rplate" name="rplate" [(ngModel)]="plate">
          </div>
          <button class="btn btn-primary" type="submit">{{ 'search' | t }}</button>
        </form>

        <div class="card table-wrap">
          @if (trips().length === 0) {
            <p class="muted">—</p>
          } @else {
            <table>
              <thead>
                <tr><th>{{ 'arrived' | t }}</th><th>{{ 'route' | t }}</th><th>{{ 'bus' | t }}</th><th>{{ 'driver' | t }}</th><th>{{ 'passengers' | t }}</th><th>{{ 'departed' | t }}</th><th>{{ 'status' | t }}</th></tr>
              </thead>
              <tbody>
                @for (t of trips(); track t.id) {
                  <tr>
                    <td>{{ t.arrivedAt | date: 'dd/MM HH:mm' : tz }}</td>
                    <td>→ {{ t.route?.destinationCity?.name }}</td>
                    <td><a [routerLink]="['/trips', t.id]">{{ t.bus.plate }}</a></td>
                    <td>{{ t.driverName || '—' }}</td>
                    <td>{{ t.seatsBooked }}/{{ t.bus.seatCount }}</td>
                    <td>{{ t.departedAt ? (t.departedAt | date: 'HH:mm' : tz) : '—' }}</td>
                    <td><span [class]="'badge badge-' + t.status">{{ statusKey(t) | t }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      } @else {
        <form class="card row" (ngSubmit)="searchPassengers()">
          <div class="field grow">
            <label for="pq">{{ 'name' | t }} / {{ 'phone' | t }}</label>
            <input id="pq" name="pq" minlength="2" [(ngModel)]="q">
          </div>
          <button class="btn btn-primary" type="submit" style="align-self: flex-end">{{ 'search' | t }}</button>
        </form>

        <div class="card table-wrap">
          @if (passengers().length === 0) {
            <p class="muted">—</p>
          } @else {
            <table>
              <thead>
                <tr><th>{{ 'date' | t }}</th><th>{{ 'name' | t }}</th><th>{{ 'phone' | t }}</th><th>{{ 'seats' | t }}</th><th>{{ 'route' | t }}</th><th>{{ 'bus' | t }}</th><th>{{ 'status' | t }}</th></tr>
              </thead>
              <tbody>
                @for (p of passengers(); track p.id) {
                  <tr>
                    <td>{{ p.createdAt | date: 'dd/MM HH:mm' : tz }}</td>
                    <td>{{ p.name }}</td>
                    <td>+252 {{ p.phone }}</td>
                    <td>{{ p.seats }}</td>
                    <td>{{ p.trip?.route?.station?.name }} → {{ p.trip?.route?.destinationCity?.name }}</td>
                    <td>
                      @if (p.trip) { <a [routerLink]="['/trips', p.trip.id]">{{ p.trip.bus.plate }}</a> }
                    </td>
                    <td>{{ (p.status === 'active' ? 'booked' : 'cancelled') | t }}</td>
                  </tr>
                }
              </tbody>
            </table>
          }
        </div>
      }
    </div>
  `,
})
export class RecordsComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);
  readonly tz = MOGADISHU_TZ;

  readonly tab = signal<'trips' | 'passengers'>('trips');
  readonly routes = computed(() => this.ctx.station()?.routes ?? []);
  readonly trips = signal<Trip[]>([]);
  readonly passengers = signal<Passenger[]>([]);
  readonly error = signal('');

  date = mogadishuToday();
  routeId: number | null = null;
  plate = '';
  q = '';

  constructor() {
    // Show today's trips for the current boosteejo straight away.
    effect(() => {
      if (this.ctx.stationId()) this.searchTrips();
    });
  }

  statusKey(t: Trip): TextKey {
    return t.status;
  }

  searchTrips() {
    this.api
      .records({
        date: this.date || undefined,
        routeId: this.routeId ?? undefined,
        plate: this.plate.trim() || undefined,
        stationId: this.ctx.stationId() ?? undefined,
      })
      .subscribe({
        next: (list) => {
          this.trips.set(list);
          this.error.set('');
        },
        error: (e) => this.error.set(errorText(e)),
      });
  }

  searchPassengers() {
    if (this.q.trim().length < 2) return;
    this.api.searchPassengers(this.q.trim()).subscribe({
      next: (list) => {
        this.passengers.set(list);
        this.error.set('');
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
