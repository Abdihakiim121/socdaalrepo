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
      <header class="page-header">
        <div>
          <h1>{{ 'queue' | t }}</h1>
          <p class="page-sub">{{ 'queueSub' | t }}</p>
        </div>
        <div class="page-actions">
          <a class="btn btn-primary" routerLink="/buses/arrival" [queryParams]="{ routeId: selectedRouteId() }">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
            {{ 'registerBus' | t }}
          </a>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel">
        @if (routes().length === 0) {
          <div class="empty">
            <h3>{{ 'routes' | t }}</h3>
            <p>{{ 'noRoutes' | t }}</p>
          </div>
        } @else {
          <div class="panel-header">
            <div class="segmented" role="tablist" [attr.aria-label]="'route' | t">
              @for (r of routes(); track r.id) {
                <button type="button" role="tab" [class.on]="r.id === selectedRouteId()"
                        [attr.aria-selected]="r.id === selectedRouteId()" (click)="selectRoute(r.id)">
                  {{ r.destinationCity?.name }}
                </button>
              }
            </div>
            <span class="muted">{{ trips().length }} {{ 'busesInQueue' | t }}</span>
          </div>

          @if (trips().length === 0 && !loading()) {
            <div class="empty">
              <h3>{{ 'noBuses' | t }}</h3>
              <p>{{ 'noBusesHint' | t }}</p>
              <a class="btn" routerLink="/buses/arrival" [queryParams]="{ routeId: selectedRouteId() }">{{ 'registerBus' | t }}</a>
            </div>
          }

          @for (trip of trips(); track trip.id; let first = $first; let last = $last) {
            <div class="board-row" [class.boarding]="trip.status === 'boarding'">
              <span class="board-pos" [attr.aria-label]="'#' + trip.queuePosition">{{ trip.queuePosition }}</span>

              <div class="board-time">
                <label class="sr" [for]="'time-' + trip.id">{{ 'departureTime' | t }}</label>
                <input [id]="'time-' + trip.id" type="time" [value]="time(trip)" (change)="setTime(trip, $event)">
                @if (!trip.departureTime) { <span class="hint">{{ 'timeNotSet' | t }}</span> }
              </div>

              <div class="board-bus">
                <a [routerLink]="['/trips', trip.id]"><span class="plate">{{ trip.bus.plate }}</span></a>
                <span class="driver">{{ trip.driverName || ('driver' | t) + ': —' }}</span>
              </div>

              <div class="board-seats">
                <span class="count"><strong>{{ trip.seatsBooked }}</strong> {{ 'of' | t }} {{ trip.bus.seatCount }} {{ 'booked' | t }}</span>
                <div class="meter" [class.full]="trip.seatsLeft === 0" role="presentation">
                  <span [style.width.%]="pct(trip)"></span>
                </div>
              </div>

              <span [class]="'status status-' + trip.status">{{ statusKey(trip) | t }}</span>

              <div class="board-actions">
                <button type="button" class="btn btn-icon btn-sm" [attr.aria-label]="'moveUp' | t" [title]="'moveUp' | t" [disabled]="first || busy()" (click)="move(trip, 'up')">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 15l6-6 6 6"></path></svg>
                </button>
                <button type="button" class="btn btn-icon btn-sm" [attr.aria-label]="'moveDown' | t" [title]="'moveDown' | t" [disabled]="last || busy()" (click)="move(trip, 'down')">
                  <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6"></path></svg>
                </button>
                @if (first) {
                  <button type="button" class="btn btn-primary btn-sm" [disabled]="busy()" (click)="depart(trip)">{{ 'markDeparted' | t }}</button>
                } @else {
                  <a class="btn btn-sm" [routerLink]="['/trips', trip.id]">{{ 'passengers' | t }}</a>
                }
              </div>
            </div>
          }
        }
      </section>
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

  pct(trip: Trip) {
    return trip.bus.seatCount ? Math.min(100, Math.round((trip.seatsBooked / trip.bus.seatCount) * 100)) : 0;
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
