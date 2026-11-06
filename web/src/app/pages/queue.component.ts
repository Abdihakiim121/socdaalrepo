import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Observable } from 'rxjs';
import { Router, RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Trip } from '../core/api.types';
import { TextKey, TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';
import { isoToTime, timeToIso } from '../core/time';

@Component({
  selector: 'app-queue',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <h1>{{ 'queue' | t }}</h1>
        <a class="btn btn-primary" routerLink="/buses/arrival" [queryParams]="{ routeId: selectedRouteId() }">
          {{ 'registerBus' | t }}
        </a>
      </div>

      @if (routes().length === 0) {
        <div class="empty">{{ 'noRoutes' | t }}</div>
      } @else {
        <div class="row" role="group" [attr.aria-label]="'route' | t">
          @for (r of routes(); track r.id) {
            <button type="button" class="pill" [class.active]="r.id === selectedRouteId()" (click)="selectRoute(r.id)">
              → {{ r.destinationCity?.name }}
            </button>
          }
        </div>
      }

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (selectedRouteId() && trips().length === 0 && !loading()) {
        <div class="empty">{{ 'noBuses' | t }}</div>
      }

      @for (trip of trips(); track trip.id; let first = $first; let last = $last) {
        <div class="card queue-item">
          <div class="queue-pos">{{ trip.queuePosition }}</div>
          <div class="grow">
            <a [routerLink]="['/trips', trip.id]"><strong>{{ trip.bus.plate }}</strong></a>
            <div class="muted small">
              {{ trip.driverName || '—' }} · {{ trip.seatsBooked }}/{{ trip.bus.seatCount }} {{ 'booked' | t }} ·
              {{ trip.seatsLeft }} {{ 'seatsLeft' | t }}
            </div>
          </div>
          <span [class]="'badge badge-' + trip.status">{{ statusKey(trip) | t }}</span>
          <div class="field">
            <label [for]="'time-' + trip.id">{{ 'departureTime' | t }}</label>
            <input [id]="'time-' + trip.id" type="time" [value]="time(trip)" (change)="setTime(trip, $event)">
          </div>
          <div class="row">
            <button type="button" class="btn btn-icon" [attr.aria-label]="'moveUp' | t" [disabled]="first || busy()" (click)="move(trip, 'up')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 15l6-6 6 6"></path></svg>
            </button>
            <button type="button" class="btn btn-icon" [attr.aria-label]="'moveDown' | t" [disabled]="last || busy()" (click)="move(trip, 'down')">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
            </button>
            @if (first) {
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="depart(trip)">{{ 'markDeparted' | t }}</button>
            }
          </div>
        </div>
      }
    </div>
  `,
})
export class QueueComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  private readonly ctx = inject(StationContextService);

  /** From the address: /queue?routeId=12 */
  readonly routeId = input<string>();

  readonly routes = computed(() =>
    (this.ctx.station()?.routes ?? [])
      .filter((r) => r.active)
      .sort((a, b) => (a.destinationCity?.name ?? '').localeCompare(b.destinationCity?.name ?? '')),
  );
  readonly selectedRouteId = computed(() => {
    const fromUrl = Number(this.routeId());
    const list = this.routes();
    return list.some((r) => r.id === fromUrl) ? fromUrl : list[0]?.id ?? null;
  });

  readonly trips = signal<Trip[]>([]);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    effect(() => {
      const id = this.selectedRouteId();
      if (id) this.load(id);
    }, { allowSignalWrites: true });
    inject(LiveService)
      .on()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => {
        const id = this.selectedRouteId();
        if (id && e.routeId === id) this.load(id);
      });
  }

  selectRoute(id: number) {
    this.router.navigate([], { queryParams: { routeId: id } });
  }

  statusKey(trip: Trip): TextKey {
    return trip.status;
  }

  time(trip: Trip) {
    return isoToTime(trip.departureTime);
  }

  setTime(trip: Trip, event: Event) {
    const value = (event.target as HTMLInputElement).value;
    this.run(this.api.updateTrip(trip.id, { departureTime: value ? timeToIso(value) : null }));
  }

  move(trip: Trip, direction: 'up' | 'down') {
    this.run(this.api.moveTrip(trip.id, direction));
  }

  depart(trip: Trip) {
    if (!confirm(`${trip.bus.plate}: ${trip.seatsBooked} passengers. Mark departed?`)) return;
    this.run(this.api.departTrip(trip.id));
  }

  private run(call: Observable<unknown>) {
    this.busy.set(true);
    this.error.set('');
    call.subscribe({
      next: () => {
        this.busy.set(false);
        const id = this.selectedRouteId();
        if (id) this.load(id);
      },
      error: (e: unknown) => {
        this.busy.set(false);
        this.error.set(errorText(e));
      },
    });
  }

  private load(routeId: number) {
    this.loading.set(true);
    this.api.queue(routeId).subscribe({
      next: (q) => {
        this.trips.set(q.trips);
        this.loading.set(false);
      },
      error: (e) => {
        this.error.set(errorText(e));
        this.loading.set(false);
      },
    });
  }
}
