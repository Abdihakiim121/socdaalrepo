import { DatePipe } from '@angular/common';
import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Trip } from '../core/api.types';
import { TextKey, TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';
import { MOGADISHU_TZ, mogadishuToday } from '../core/time';
import { IconComponent } from '../shared/icon.component';

/** Every bus that queued at this boosteejo, by day, route or plate. */
@Component({
  selector: 'app-trips',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>{{ 'trips' | t }}</h1>
          <p class="page-sub">{{ 'tripsSub' | t }}</p>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel">
        <form class="toolbar" (ngSubmit)="search()">
          <div class="field">
            <label class="label" for="tdate">{{ 'date' | t }}</label>
            <input class="input" id="tdate" name="tdate" type="date" [(ngModel)]="date" (change)="search()">
          </div>
          <div class="field">
            <label class="label" for="troute">{{ 'route' | t }}</label>
            <select class="select" id="troute" name="troute" [(ngModel)]="routeId" (change)="search()">
              <option [ngValue]="null">{{ 'allRoutes' | t }}</option>
              @for (r of routes(); track r.id) {
                <option [ngValue]="r.id">{{ r.destinationCity?.name }}</option>
              }
            </select>
          </div>
          <div class="field grow">
            <label class="label" for="tplate">{{ 'plate' | t }}</label>
            <div class="input-icon">
              <app-icon name="search" />
              <input class="input" id="tplate" name="tplate" [(ngModel)]="plate" placeholder="BN 4127">
            </div>
          </div>
          <button class="btn" type="submit">{{ 'search' | t }}</button>
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
                  <tr class="link-row" [routerLink]="['/boosteejo/trips', t.id]">
                    <td>{{ t.arrivedAt | date: 'dd MMM, HH:mm' : tz }}</td>
                    <td>{{ t.route?.destinationCity?.name }}</td>
                    <td><a [routerLink]="['/boosteejo/trips', t.id]"><span class="plate">{{ t.bus.plate }}</span></a></td>
                    <td>{{ t.driverName || '—' }}</td>
                    <td class="num">{{ t.seatsBooked }} / {{ t.bus.seatCount }}</td>
                    <td>{{ t.departedAt ? (t.departedAt | date: 'HH:mm' : tz) : '—' }}</td>
                    <td><span [class]="'status status-' + t.status">{{ statusKey(t) | t }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-foot">{{ trips().length }} {{ 'trips' | t }}</div>
        }
      </section>
    </div>
  `,
})
export class TripsComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);
  readonly tz = MOGADISHU_TZ;

  readonly routes = computed(() => this.ctx.station()?.routes ?? []);
  readonly trips = signal<Trip[]>([]);
  readonly error = signal('');

  date = mogadishuToday();
  routeId: number | null = null;
  plate = '';

  constructor() {
    effect(() => {
      if (this.ctx.stationId()) this.search();
    });
  }

  statusKey(t: Trip): TextKey {
    return t.status;
  }

  search() {
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
}
