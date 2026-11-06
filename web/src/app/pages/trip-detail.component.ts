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
        <div class="page-head">
          <div>
            <a class="small" routerLink="/queue" [queryParams]="{ routeId: t.routeId }">← {{ 'queue' | t }}</a>
            <h1>{{ t.bus.plate }} · {{ origin() }} → {{ t.route?.destinationCity?.name }}</h1>
            <span class="muted">
              {{ t.driverName || '—' }}
              @if (t.departureTime) { · {{ 'departureTime' | t }} {{ t.departureTime | date: 'HH:mm' : tz }} }
            </span>
          </div>
          <span [class]="'badge badge-' + t.status">{{ statusKey(t) | t }}</span>
        </div>

        <div class="grid">
          <div class="card stat"><span class="muted small">{{ 'seats' | t }}</span><strong>{{ t.bus.seatCount }}</strong></div>
          <div class="card stat"><span class="muted small">{{ 'booked' | t }}</span><strong>{{ t.seatsBooked }}</strong></div>
          <div class="card stat"><span class="muted small">{{ 'seatsLeft' | t }}</span><strong>{{ t.seatsLeft }}</strong></div>
        </div>

        @if (inQueue()) {
          <form class="card stack" (ngSubmit)="add()">
            <h2>{{ 'addPassenger' | t }}</h2>
            <div class="form-grid">
              <div class="field">
                <label for="pname">{{ 'name' | t }}</label>
                <input id="pname" name="pname" required minlength="2" [(ngModel)]="name">
              </div>
              <div class="field">
                <label for="pphone">{{ 'phone' | t }}</label>
                <input id="pphone" name="pphone" type="tel" required [(ngModel)]="phone" placeholder="61 234 5678">
              </div>
              <div class="field">
                <label for="pseats">{{ 'seats' | t }}</label>
                <input id="pseats" name="pseats" type="number" min="1" [max]="t.seatsLeft" required [(ngModel)]="seats">
              </div>
              <button class="btn btn-primary" type="submit" [disabled]="busy() || t.seatsLeft === 0">{{ 'addPassenger' | t }}</button>
            </div>
          </form>
        }

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }

        <div class="card stack">
          <h2>{{ 'passengers' | t }} ({{ activeCount() }})</h2>
          @if (passengers().length === 0) {
            <p class="muted">{{ 'noPassengers' | t }}</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr><th>#</th><th>{{ 'name' | t }}</th><th>{{ 'phone' | t }}</th><th>{{ 'seats' | t }}</th><th>{{ 'status' | t }}</th><th><span class="sr">{{ 'cancel' | t }}</span></th></tr>
                </thead>
                <tbody>
                  @for (p of passengers(); track p.id; let i = $index) {
                    <tr [style.opacity]="p.status === 'cancelled' ? 0.55 : 1">
                      <td>{{ i + 1 }}</td>
                      <td>{{ p.name }}</td>
                      <td>+252 {{ p.phone }}</td>
                      <td>{{ p.seats }}</td>
                      <td>{{ (p.status === 'active' ? 'booked' : 'cancelled') | t }}</td>
                      <td>
                        @if (p.status === 'active' && inQueue()) {
                          <button type="button" class="btn btn-danger" (click)="cancelPassenger(p)">{{ 'cancel' | t }}</button>
                        }
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>

        @if (inQueue()) {
          <div class="row">
            <button type="button" class="btn btn-primary" [disabled]="busy()" (click)="depart()">{{ 'markDeparted' | t }}</button>
            @if (activeCount() === 0) {
              <button type="button" class="btn btn-danger" [disabled]="busy()" (click)="removeFromQueue()">{{ 'removeFromQueue' | t }}</button>
            }
          </div>
        }
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
