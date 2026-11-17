import { Component, ElementRef, HostListener, computed, effect, inject, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { Trip } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';
import { isoToTime } from '../core/time';
import { IconComponent } from './icon.component';
import { RegisterPassengerService } from './register-passenger.service';

interface Added {
  name: string;
  plate: string;
  booked: number;
  seats: number;
}

/**
 * Register a passenger in one place: pick the route, the boarding bus is already chosen,
 * type phone, name and seats. The panel stays open so a whole line can be registered quickly.
 */
@Component({
  selector: 'app-register-passenger',
  standalone: true,
  imports: [FormsModule, RouterLink, TranslatePipe, IconComponent],
  template: `
    <div class="sheet-backdrop" (click)="close()"></div>
    <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="rp-title">
      <form class="sheet-form" (ngSubmit)="submit()">
        <header class="sheet-header">
          <h2 id="rp-title">{{ 'addPassenger' | t }}</h2>
          <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'close' | t" (click)="close()"><app-icon name="close" /></button>
        </header>

        <div class="sheet-body">
          @if (added(); as a) {
            <div class="alert alert-success" role="status">
              <app-icon name="check" />
              <span><strong>{{ a.name }}</strong> {{ 'registeredOn' | t }} <span class="plate plate-sm">{{ a.plate }}</span> · {{ a.booked }}/{{ a.seats }} {{ 'booked' | t }}</span>
            </div>
          }

          <!-- 1. Route -->
          <div class="field">
            <span class="label" id="rp-route">{{ 'route' | t }}</span>
            @if (routes().length === 0) {
              <p class="hint">{{ 'noRoutes' | t }}</p>
            } @else {
              <div class="segmented wrap" role="radiogroup" aria-labelledby="rp-route">
                @for (r of routes(); track r.id) {
                  <button type="button" role="radio" [class.on]="r.id === routeId()" [attr.aria-checked]="r.id === routeId()" (click)="selectRoute(r.id)">
                    {{ r.destinationCity?.name }}
                  </button>
                }
              </div>
            }
          </div>

          <!-- 2. Bus -->
          @if (routeId()) {
            <div class="field">
              <span class="label" id="rp-bus">{{ 'bus' | t }}</span>
              @if (!loading() && trips().length === 0) {
                <div class="inline-empty">
                  <span>{{ 'noBuses' | t }}</span>
                  <a routerLink="/boosteejo/arrival" [queryParams]="{ routeId: routeId() }" (click)="close()">{{ 'registerArrival' | t }}</a>
                </div>
              }
              <div class="bus-options" role="radiogroup" aria-labelledby="rp-bus">
                @for (t of trips(); track t.id) {
                  <button type="button" role="radio" class="bus-option" [class.on]="t.id === tripId()" [attr.aria-checked]="t.id === tripId()"
                          [disabled]="t.seatsLeft === 0" (click)="tripId.set(t.id)">
                    <span class="bo-pos">{{ t.queuePosition }}</span>
                    <span class="bo-main">
                      <span class="plate">{{ t.bus.plate }}</span>
                      <span class="bo-time">{{ time(t) || ('timeNotSet' | t) }}@if (t.status === 'boarding') { · {{ 'boarding' | t }} }</span>
                    </span>
                    <span class="bo-seats" [class.full]="t.seatsLeft === 0">
                      @if (t.seatsLeft === 0) { {{ 'full' | t }} } @else { <strong>{{ t.seatsLeft }}</strong> {{ 'seatsLeft' | t }} }
                    </span>
                  </button>
                }
              </div>
            </div>
          }

          <!-- 3. Passenger -->
          <h3 class="sheet-section">{{ 'passenger' | t }}</h3>
          <div class="field">
            <label class="label" for="rp-phone">{{ 'phone' | t }}</label>
            <div class="input-group">
              <span class="addon">+252</span>
              <input #phoneInput class="input" id="rp-phone" name="rp-phone" type="tel" inputmode="numeric" autocomplete="off"
                     required [(ngModel)]="phone" (blur)="lookUp()" placeholder="61 234 5678">
            </div>
            @if (foundName()) { <span class="hint">{{ 'foundEarlier' | t }}</span> }
          </div>
          <div class="field">
            <label class="label" for="rp-name">{{ 'name' | t }}</label>
            <input class="input" id="rp-name" name="rp-name" autocomplete="off" required minlength="2" [(ngModel)]="name">
          </div>
          <div class="field">
            <span class="label" id="rp-seats">{{ 'seats' | t }}</span>
            <div class="stepper" role="group" aria-labelledby="rp-seats">
              <button type="button" class="btn btn-icon" [attr.aria-label]="'fewerSeats' | t" [disabled]="seats() <= 1" (click)="seats.set(seats() - 1)"><app-icon name="minus" /></button>
              <output aria-live="polite">{{ seats() }}</output>
              <button type="button" class="btn btn-icon" [attr.aria-label]="'moreSeats' | t" [disabled]="seats() >= maxSeats()" (click)="seats.set(seats() + 1)"><app-icon name="plus" /></button>
            </div>
          </div>

          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }
        </div>

        <footer class="sheet-footer">
          <button type="button" class="btn" (click)="close()">{{ (added() ? 'done' : 'cancel') | t }}</button>
          <button type="submit" class="btn btn-primary" [disabled]="busy() || !canSubmit()">{{ 'addPassenger' | t }}</button>
        </footer>
      </form>
    </aside>
  `,
  styles: [`
    .segmented.wrap { display: flex; flex-wrap: wrap; }
    .bus-options { display: flex; flex-direction: column; gap: 6px; }
    .bus-option {
      display: grid; grid-template-columns: 28px 1fr auto; align-items: center; gap: 12px; padding: 10px 12px;
      border: 1px solid var(--line-strong); border-radius: var(--r); background: var(--surface); font: inherit; color: var(--ink);
      text-align: left; cursor: pointer;
    }
    .bus-option:hover:not(:disabled) { border-color: #b4bbc5; }
    .bus-option.on { border-color: var(--teal); background: var(--teal-tint); box-shadow: 0 0 0 1px var(--teal); }
    .bus-option:disabled { opacity: 0.55; cursor: not-allowed; }
    .bo-pos { font-family: var(--font-cond); font-weight: 600; font-size: 20px; color: var(--muted); text-align: center; }
    .bus-option.on .bo-pos { color: var(--teal); }
    .bo-main { display: flex; flex-direction: column; align-items: flex-start; gap: 3px; }
    .bo-time { font-size: 12.5px; color: var(--muted); }
    .bo-seats { font-size: 13px; color: var(--muted-ink); white-space: nowrap; }
    .bo-seats strong { font-family: var(--font-cond); font-size: 16px; color: var(--ink); }
    .bo-seats.full { color: var(--red); font-weight: 500; }
    .inline-empty { display: flex; flex-wrap: wrap; gap: 8px; justify-content: space-between; padding: 12px; border: 1px dashed var(--line-strong); border-radius: var(--r); color: var(--muted); }
    .stepper { display: inline-flex; align-items: center; gap: 8px; }
    .stepper output { min-width: 40px; text-align: center; font-family: var(--font-cond); font-size: 22px; font-weight: 600; }
    .alert app-icon { margin-top: 2px; }
    .plate-sm { font-size: 13px; padding: 0 6px; }
  `],
})
export class RegisterPassengerComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);
  private readonly panel = inject(RegisterPassengerService);
  private readonly phoneInput = viewChild<ElementRef<HTMLInputElement>>('phoneInput');

  readonly routes = computed(() =>
    (this.ctx.station()?.routes ?? [])
      .filter((r) => r.active)
      .sort((a, b) => (a.destinationCity?.name ?? '').localeCompare(b.destinationCity?.name ?? '')),
  );
  readonly routeId = signal<number | null>(null);
  readonly trips = signal<Trip[]>([]);
  readonly tripId = signal<number | null>(null);
  readonly seats = signal(1);
  readonly loading = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly added = signal<Added | null>(null);
  readonly foundName = signal(false);

  readonly trip = computed(() => this.trips().find((t) => t.id === this.tripId()) ?? null);
  readonly maxSeats = computed(() => Math.max(1, this.trip()?.seatsLeft ?? 1));

  name = '';
  phone = '';

  constructor() {
    const request = this.panel.request() ?? {};
    const list = this.routes();
    const wanted = request.routeId ?? this.panel.lastRouteId;
    const start = list.find((r) => r.id === wanted)?.id ?? list[0]?.id ?? null;
    if (start) this.selectRoute(start, request.tripId);
    // The boosteejo's routes may still be loading when the panel opens.
    effect(() => {
      const first = this.routes()[0];
      if (!this.routeId() && first) this.selectRoute(first.id, request.tripId);
    }, { allowSignalWrites: true });
  }

  @HostListener('document:keydown.escape')
  close() {
    this.panel.close();
  }

  time(t: Trip) {
    return isoToTime(t.departureTime);
  }

  canSubmit() {
    const t = this.trip();
    return !!t && t.seatsLeft >= this.seats() && this.name.trim().length >= 2 && this.phone.replace(/\D/g, '').length >= 7;
  }

  selectRoute(routeId: number, preferTripId?: number) {
    this.routeId.set(routeId);
    this.panel.lastRouteId = routeId;
    this.tripId.set(null);
    this.trips.set([]);
    this.loadQueue(preferTripId);
  }

  /** If this phone number travelled before, fill in the name. */
  lookUp() {
    const digits = this.phone.replace(/\D/g, '');
    if (digits.length < 7 || this.name.trim()) return;
    this.api.listPassengers({ q: digits }).subscribe({
      next: (list) => {
        const match = list.find((p) => p.phone.endsWith(digits.slice(-9)));
        if (match && !this.name.trim()) {
          this.name = match.name;
          this.foundName.set(true);
        }
      },
      error: () => {
        /* the lookup is a convenience; typing the name still works */
      },
    });
  }

  submit() {
    const t = this.trip();
    if (!t || !this.canSubmit()) return;
    this.busy.set(true);
    this.error.set('');
    const seats = this.seats();
    this.api.addPassenger(t.id, { name: this.name.trim(), phone: this.phone.trim(), seats }).subscribe({
      next: (p) => {
        this.busy.set(false);
        this.added.set({ name: p.name, plate: t.bus.plate, booked: t.seatsBooked + seats, seats: t.bus.seatCount });
        // Ready for the next person in line.
        this.name = '';
        this.phone = '';
        this.seats.set(1);
        this.foundName.set(false);
        this.loadQueue(t.id);
        this.phoneInput()?.nativeElement.focus();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorText(e));
        this.loadQueue(t.id);
      },
    });
  }

  private loadQueue(preferTripId?: number) {
    const routeId = this.routeId();
    if (!routeId) return;
    this.loading.set(true);
    this.api.queue(routeId).subscribe({
      next: (q) => {
        this.loading.set(false);
        this.trips.set(q.trips);
        // Keep the chosen bus while it has seats; otherwise move to the next bus in line that does.
        const keep = q.trips.find((x) => x.id === (preferTripId ?? this.tripId()) && x.seatsLeft > 0);
        const next = keep ?? q.trips.find((x) => x.seatsLeft > 0) ?? null;
        this.tripId.set(next?.id ?? null);
        if (this.seats() > (next?.seatsLeft ?? 1)) this.seats.set(Math.max(1, next?.seatsLeft ?? 1));
      },
      error: (e) => {
        this.loading.set(false);
        this.error.set(errorText(e));
      },
    });
  }
}
