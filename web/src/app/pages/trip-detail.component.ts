import { DatePipe } from '@angular/common';
import { Component, DestroyRef, computed, effect, inject, input, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { Passenger, Trip } from '../core/api.types';
import { I18nService, TextKey, TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';
import { MOGADISHU_TZ } from '../core/time';

/** One bus on one route: its passenger list, registering passengers, and departure. */
@Component({
  selector: 'app-trip-detail',
  standalone: true,
  imports: [FormsModule, RouterLink, DatePipe, TranslatePipe],
  template: `
    <div class="page">
      @if (trip(); as t) {
        <header class="page-header">
          <div>
            <a class="crumb" routerLink="/queue" [queryParams]="{ routeId: t.routeId }">{{ 'queue' | t }}</a>
            <div class="title-row">
              <span class="plate plate-lg">{{ t.bus.plate }}</span>
              <h1>{{ origin() }} → {{ t.route?.destinationCity?.name }}</h1>
              <span [class]="'status status-' + t.status">{{ statusKey(t) | t }}</span>
            </div>
            <p class="page-sub">
              {{ 'driver' | t }}: {{ t.driverName || '—' }}{{ t.driverPhone ? ', +252 ' + t.driverPhone : '' }}
            </p>
          </div>
          @if (inQueue()) {
            <div class="page-actions">
              @if (activeCount() === 0) {
                <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="removeFromQueue()">{{ 'removeFromQueue' | t }}</button>
              }
              <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="depart()">{{ 'markDeparted' | t }}</button>
            </div>
          }
        </header>

        <section class="panel stats">
          <div class="stat">
            <span class="stat-label">{{ 'departureTime' | t }}</span>
            <span class="stat-value">{{ t.departureTime ? (t.departureTime | date: 'HH:mm' : tz) : '—' }}</span>
          </div>
          <div class="stat">
            <span class="stat-label">{{ 'booked' | t }}</span>
            <span class="stat-value">{{ t.seatsBooked }} <span class="stat-of">/ {{ t.bus.seatCount }}</span></span>
            <div class="meter" [class.full]="t.seatsLeft === 0" role="presentation"><span [style.width.%]="pct(t)"></span></div>
          </div>
          <div class="stat">
            <span class="stat-label">{{ 'seatsLeft' | t }}</span>
            <span class="stat-value">{{ t.seatsLeft }}</span>
          </div>
        </section>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        @if (inQueue()) {
          <form class="panel" (ngSubmit)="add()">
            <div class="panel-header"><h2>{{ 'addPassenger' | t }}</h2></div>
            <div class="panel-body passenger-form">
              <div class="field">
                <label class="label" for="pname">{{ 'name' | t }}</label>
                <input class="input" id="pname" name="pname" required minlength="2" [(ngModel)]="name" autocomplete="off">
              </div>
              <div class="field">
                <label class="label" for="pphone">{{ 'phone' | t }}</label>
                <div class="input-group">
                  <span class="addon">+252</span>
                  <input class="input" id="pphone" name="pphone" type="tel" required [(ngModel)]="phone" placeholder="61 234 5678" autocomplete="off">
                </div>
              </div>
              <div class="field seats-field">
                <label class="label" for="pseats">{{ 'seats' | t }}</label>
                <input class="input" id="pseats" name="pseats" type="number" min="1" [max]="t.seatsLeft" required [(ngModel)]="seats">
              </div>
              <button class="btn btn-primary" type="submit" [disabled]="busy() || t.seatsLeft === 0">
                {{ t.seatsLeft === 0 ? ('full' | t) : ('addPassenger' | t) }}
              </button>
            </div>
          </form>
        }

        <section class="panel">
          <div class="panel-header">
            <h2>{{ 'passengers' | t }}</h2>
            <span class="muted">{{ activeCount() }} {{ 'booked' | t }}</span>
          </div>
          @if (passengers().length === 0) {
            <div class="empty"><p>{{ 'noPassengers' | t }}</p></div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th class="num">#</th>
                    <th>{{ 'name' | t }}</th>
                    <th>{{ 'phone' | t }}</th>
                    <th class="num">{{ 'seats' | t }}</th>
                    <th>{{ 'status' | t }}</th>
                    <th><span class="sr">{{ 'cancel' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (p of passengers(); track p.id; let i = $index) {
                    <tr [class.row-dim]="p.status === 'cancelled'">
                      <td class="num muted">{{ i + 1 }}</td>
                      <td class="strong">{{ p.name }}</td>
                      <td>+252 {{ p.phone }}</td>
                      <td class="num">{{ p.seats }}</td>
                      <td><span [class]="'status status-' + p.status">{{ (p.status === 'active' ? 'statusBooked' : 'cancelled') | t }}</span></td>
                      <td class="num">
                        @if (p.status === 'active' && inQueue()) {
                          <button type="button" class="btn btn-sm btn-danger" (click)="cancelPassenger(p)">{{ 'cancel' | t }}</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      } @else if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }
    </div>
  `,
})
export class TripDetailComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);
  private readonly i18n = inject(I18nService);

  /** From the address: /trips/42 */
  readonly id = input.required<string>();
  readonly tz = MOGADISHU_TZ;

  readonly trip = signal<Trip | null>(null);
  readonly passengers = signal<Passenger[]>([]);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly inQueue = computed(() => ['waiting', 'boarding'].includes(this.trip()?.status ?? ''));
  readonly activeCount = computed(() =>
    this.passengers().filter((p) => p.status === 'active').reduce((n, p) => n + p.seats, 0),
  );
  readonly origin = computed(() => this.ctx.station()?.city?.name ?? '');

  name = '';
  phone = '';
  seats = 1;

  constructor() {
    effect(() => this.load(Number(this.id())), { allowSignalWrites: true });
    inject(LiveService)
      .on()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe((e) => {
        const t = this.trip();
        if (t && (e.tripId === t.id || e.routeId === t.routeId)) this.load(t.id);
      });
  }

  pct(t: Trip) {
    return t.bus.seatCount ? Math.min(100, Math.round((t.seatsBooked / t.bus.seatCount) * 100)) : 0;
  }

  statusKey(t: Trip): TextKey {
    return t.status;
  }

  add() {
    const t = this.trip();
    if (!t) return;
    this.busy.set(true);
    this.error.set('');
    this.api.addPassenger(t.id, { name: this.name.trim(), phone: this.phone.trim(), seats: Number(this.seats) }).subscribe({
      next: () => {
        this.name = '';
        this.phone = '';
        this.seats = 1;
        this.busy.set(false);
        this.load(t.id);
      },
      error: (e) => {
        this.error.set(errorText(e));
        this.busy.set(false);
      },
    });
  }

  cancelPassenger(p: Passenger) {
    if (!confirm(`${p.name} (${p.seats}) — ${this.i18n.t('cancel')}?`)) return;
    this.act(this.api.cancelPassenger(p.id));
  }

  depart() {
    const t = this.trip();
    if (!t || !confirm(`${t.bus.plate}: ${t.seatsBooked} passengers. Mark departed?`)) return;
    this.act(this.api.departTrip(t.id));
  }

  removeFromQueue() {
    const t = this.trip();
    if (!t || !confirm(`${t.bus.plate}: remove from queue?`)) return;
    this.act(this.api.cancelTrip(t.id));
  }

  private act(call: Observable<unknown>) {
    const t = this.trip();
    this.busy.set(true);
    this.error.set('');
    call.subscribe({
      next: () => {
        this.busy.set(false);
        if (t) this.load(t.id);
      },
      error: (e: unknown) => {
        this.error.set(errorText(e));
        this.busy.set(false);
      },
    });
  }

  private load(id: number) {
    if (!id) return;
    forkJoin({ trip: this.api.trip(id), passengers: this.api.passengers(id) }).subscribe({
      next: ({ trip, passengers }) => {
        this.trip.set(trip);
        this.passengers.set(passengers);
        this.error.set('');
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
