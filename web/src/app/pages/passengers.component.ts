import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Passenger } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';
import { MOGADISHU_TZ, mogadishuToday } from '../core/time';
import { IconComponent } from '../shared/icon.component';
import { LiveService } from '../core/live.service';

/** Everyone registered on a bus at this boosteejo: by day, route, or a name or phone search. */
@Component({
  selector: 'app-passengers',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>{{ 'passengers' | t }}</h1>
          <p class="page-sub">{{ 'passengersSub' | t }}</p>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel stats">
        <div class="stat"><span class="stat-label">{{ 'passengers' | t }}</span><span class="stat-value">{{ activeCount() }}</span></div>
        <div class="stat"><span class="stat-label">{{ 'seats' | t }}</span><span class="stat-value">{{ seatCount() }}</span></div>
        <div class="stat"><span class="stat-label">{{ 'cancelled' | t }}</span><span class="stat-value">{{ cancelledCount() }}</span></div>
      </section>

      <section class="panel">
        <form class="toolbar" (ngSubmit)="load()">
          <div class="field grow">
            <label class="label" for="pq">{{ 'searchPassenger' | t }}</label>
            <div class="input-icon">
              <app-icon name="search" />
              <input class="input" id="pq" name="pq" [(ngModel)]="q" placeholder="Amina, 61 234 5678" autocomplete="off">
            </div>
          </div>
          <div class="field">
            <label class="label" for="pdate">{{ 'date' | t }}</label>
            <input class="input" id="pdate" name="pdate" type="date" [(ngModel)]="date" [disabled]="!!q.trim()" (change)="load()">
          </div>
          <div class="field">
            <label class="label" for="proute">{{ 'route' | t }}</label>
            <select class="select" id="proute" name="proute" [(ngModel)]="routeId" (change)="load()">
              <option [ngValue]="null">{{ 'allRoutes' | t }}</option>
              @for (r of routes(); track r.id) {
                <option [ngValue]="r.id">{{ r.destinationCity?.name }}</option>
              }
            </select>
          </div>
          <button class="btn" type="submit">{{ 'search' | t }}</button>
        </form>

        @if (passengers().length === 0) {
          <div class="empty"><p>{{ q.trim() ? ('noResults' | t) : ('noPassengersDay' | t) }}</p></div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ 'time' | t }}</th>
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
                    <td>{{ p.createdAt | date: (q.trim() ? 'dd MMM, HH:mm' : 'HH:mm') : tz }}</td>
                    <td class="strong">{{ p.name }}</td>
                    <td>+252 {{ p.phone }}</td>
                    <td class="num">{{ p.seats }}</td>
                    <td>{{ p.trip?.route?.destinationCity?.name }}</td>
                    <td>
                      @if (p.trip) { <a [routerLink]="['/boosteejo/trips', p.trip.id]"><span class="plate">{{ p.trip.bus.plate }}</span></a> }
                    </td>
                    <td><span [class]="'status status-' + p.status">{{ (p.status === 'active' ? 'statusBooked' : 'cancelled') | t }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
})
export class PassengersComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);
  readonly tz = MOGADISHU_TZ;

  readonly routes = computed(() => this.ctx.station()?.routes ?? []);
  readonly passengers = signal<Passenger[]>([]);
  readonly error = signal('');

  readonly activeCount = computed(() => this.passengers().filter((p) => p.status === 'active').length);
  readonly seatCount = computed(() =>
    this.passengers().filter((p) => p.status === 'active').reduce((n, p) => n + p.seats, 0),
  );
  readonly cancelledCount = computed(() => this.passengers().filter((p) => p.status === 'cancelled').length);

  date = mogadishuToday();
  routeId: number | null = null;
  q = '';

  constructor() {
    effect(() => {
      if (this.ctx.stationId()) this.load();
    });
    // New registrations, here or on another device, show up straight away.
    inject(LiveService)
      .on()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => {
        if (e.type === 'passengers.updated') this.load();
      });
  }

  load() {
    const q = this.q.trim();
    this.api
      .listPassengers({
        q: q || undefined,
        date: q ? undefined : this.date || undefined,
        routeId: this.routeId ?? undefined,
        stationId: this.ctx.stationId() ?? undefined,
      })
      .subscribe({
        next: (list) => {
          this.passengers.set(list);
          this.error.set('');
        },
        error: (e) => this.error.set(errorText(e)),
      });
  }
}
