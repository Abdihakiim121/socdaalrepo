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
      <header class="page-header">
        <h1>{{ 'records' | t }}</h1>
        <div class="segmented" role="tablist">
          <button type="button" role="tab" [class.on]="tab() === 'trips'" [attr.aria-selected]="tab() === 'trips'" (click)="tab.set('trips')">{{ 'trips' | t }}</button>
          <button type="button" role="tab" [class.on]="tab() === 'passengers'" [attr.aria-selected]="tab() === 'passengers'" (click)="tab.set('passengers')">{{ 'passengers' | t }}</button>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (tab() === 'trips') {
        <section class="panel">
          <form class="panel-body filters" (ngSubmit)="searchTrips()">
            <div class="field">
              <label class="label" for="rdate">{{ 'date' | t }}</label>
              <input class="input" id="rdate" name="rdate" type="date" [(ngModel)]="date">
            </div>
            <div class="field">
              <label class="label" for="rroute">{{ 'route' | t }}</label>
              <select class="select" id="rroute" name="rroute" [(ngModel)]="routeId">
                <option [ngValue]="null">{{ 'allRoutes' | t }}</option>
                @for (r of routes(); track r.id) {
                  <option [ngValue]="r.id">{{ r.destinationCity?.name }}</option>
                }
              </select>
            </div>
            <div class="field">
              <label class="label" for="rplate">{{ 'plate' | t }}</label>
              <input class="input" id="rplate" name="rplate" [(ngModel)]="plate" placeholder="BN 4127">
            </div>
            <button class="btn btn-primary" type="submit">{{ 'search' | t }}</button>
          </form>

          @if (trips().length === 0) {
            <div class="empty"><p>{{ 'noResults' | t }}</p></div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ 'arrived' | t }}</th>
                    <th>{{ 'route' | t }}</th>
                    <th>{{ 'bus' | t }}</th>
                    <th>{{ 'driver' | t }}</th>
                    <th class="num">{{ 'passengers' | t }}</th>
                    <th>{{ 'departed' | t }}</th>
                    <th>{{ 'status' | t }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (t of trips(); track t.id) {
                    <tr>
                      <td>{{ t.arrivedAt | date: 'dd MMM, HH:mm' : tz }}</td>
                      <td>{{ t.route?.destinationCity?.name }}</td>
                      <td><a [routerLink]="['/trips', t.id]"><span class="plate">{{ t.bus.plate }}</span></a></td>
                      <td>{{ t.driverName || '—' }}</td>
                      <td class="num">{{ t.seatsBooked }} / {{ t.bus.seatCount }}</td>
                      <td>{{ t.departedAt ? (t.departedAt | date: 'HH:mm' : tz) : '—' }}</td>
                      <td><span [class]="'status status-' + t.status">{{ statusKey(t) | t }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else {
        <section class="panel">
          <form class="panel-body filters" (ngSubmit)="searchPassengers()">
            <div class="field wide">
              <label class="label" for="pq">{{ 'searchPassenger' | t }}</label>
              <input class="input" id="pq" name="pq" minlength="2" [(ngModel)]="q" placeholder="Amina / 61 234 5678">
            </div>
            <button class="btn btn-primary" type="submit">{{ 'search' | t }}</button>
          </form>

          @if (passengers().length === 0) {
            <div class="empty"><p>{{ 'noResults' | t }}</p></div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ 'date' | t }}</th>
                    <th>{{ 'name' | t }}</th>
                    <th>{{ 'phone' | t }}</th>
                    <th class="num">{{ 'seats' | t }}</th>
                    <th>{{ 'route' | t }}</th>
                    <th>{{ 'bus' | t }}</th>
                    <th>{{ 'status' | t }}</th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of passengers(); track p.id) {
                    <tr [class.row-dim]="p.status === 'cancelled'">
                      <td>{{ p.createdAt | date: 'dd MMM, HH:mm' : tz }}</td>
                      <td class="strong">{{ p.name }}</td>
                      <td>+252 {{ p.phone }}</td>
                      <td class="num">{{ p.seats }}</td>
                      <td>{{ p.trip?.route?.station?.name }} → {{ p.trip?.route?.destinationCity?.name }}</td>
                      <td>
                        @if (p.trip) { <a [routerLink]="['/trips', p.trip.id]"><span class="plate">{{ p.trip.bus.plate }}</span></a> }
                      </td>
                      <td><span [class]="'status status-' + p.status">{{ (p.status === 'active' ? 'statusBooked' : 'cancelled') | t }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
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
