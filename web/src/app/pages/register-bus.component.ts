import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { Observable, of, switchMap } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { Bus } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';
import { timeToIso } from '../core/time';

/** A bus arrives at the boosteejo: find it (or add it once) and put it at the end of a route's queue. */
@Component({
  selector: 'app-register-bus',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="page">
      <h1>{{ 'registerBus' | t }}</h1>

      <form class="stack" (ngSubmit)="submit()">
        <div class="card stack">
          <div class="field">
            <label for="route">{{ 'route' | t }}</label>
            <select id="route" name="route" required [(ngModel)]="chosenRouteId">
              @for (r of routes(); track r.id) {
                <option [ngValue]="r.id">{{ ctx.station()?.city?.name }} → {{ r.destinationCity?.name }}</option>
              }
            </select>
          </div>
        </div>

        <div class="card stack">
          <h2>{{ 'bus' | t }}</h2>
          @if (bus(); as b) {
            <div class="row spread">
              <div><strong>{{ b.plate }}</strong> <span class="muted">· {{ b.type || '' }} · {{ b.seatCount }} {{ 'seats' | t }}</span></div>
              <button type="button" class="btn" (click)="bus.set(null)">{{ 'cancel' | t }}</button>
            </div>
          } @else {
            <div class="row">
              <div class="field grow">
                <label for="plate">{{ 'plate' | t }}</label>
                <input id="plate" name="plate" [(ngModel)]="plate" (keydown.enter)="$event.preventDefault(); find()" placeholder="BN 4127">
              </div>
              <button type="button" class="btn" style="align-self: flex-end" (click)="find()">{{ 'search' | t }}</button>
            </div>
            @for (b of results(); track b.id) {
              <button type="button" class="btn" style="justify-content: space-between" (click)="bus.set(b)">
                <span>{{ b.plate }}</span><span class="muted">{{ b.seatCount }} {{ 'seats' | t }}</span>
              </button>
            }
            @if (searched() && results().length === 0) {
              <div class="stack">
                <strong>{{ 'newBus' | t }}: {{ plate }}</strong>
                <div class="form-grid">
                  <div class="field">
                    <label for="seats">{{ 'seats' | t }}</label>
                    <input id="seats" name="seats" type="number" min="1" max="100" required [(ngModel)]="newSeats">
                  </div>
                  <div class="field">
                    <label for="type">{{ 'busType' | t }}</label>
                    <input id="type" name="type" [(ngModel)]="newType" placeholder="Coaster">
                  </div>
                  <div class="field">
                    <label for="owner">{{ 'owner' | t }}</label>
                    <input id="owner" name="owner" [(ngModel)]="newOwner">
                  </div>
                  <div class="field">
                    <label for="ownerPhone">{{ 'ownerPhone' | t }}</label>
                    <input id="ownerPhone" name="ownerPhone" type="tel" [(ngModel)]="newOwnerPhone">
                  </div>
                </div>
              </div>
            }
          }
        </div>

        <div class="card form-grid">
          <div class="field">
            <label for="driver">{{ 'driver' | t }}</label>
            <input id="driver" name="driver" [(ngModel)]="driverName">
          </div>
          <div class="field">
            <label for="driverPhone">{{ 'driverPhone' | t }}</label>
            <input id="driverPhone" name="driverPhone" type="tel" [(ngModel)]="driverPhone">
          </div>
          <div class="field">
            <label for="time">{{ 'departureTime' | t }}</label>
            <input id="time" name="time" type="time" [(ngModel)]="departureTime">
          </div>
        </div>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }
        <button class="btn btn-primary" type="submit" [disabled]="busy() || !canSubmit()">{{ 'registerBus' | t }}</button>
      </form>
    </div>
  `,
})
export class RegisterBusComponent {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);
  readonly ctx = inject(StationContextService);

  readonly routeId = input<string>();
  readonly routes = computed(() => (this.ctx.station()?.routes ?? []).filter((r) => r.active));

  chosenRouteId: number | null = null;
  plate = '';
  newSeats = 30;
  newType = '';
  newOwner = '';
  newOwnerPhone = '';
  driverName = '';
  driverPhone = '';
  departureTime = '';

  readonly bus = signal<Bus | null>(null);
  readonly results = signal<Bus[]>([]);
  readonly searched = signal(false);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    // Routes arrive after the boosteejo loads: pick the one from the address, else the first.
    effect(() => {
      const list = this.routes();
      if (this.chosenRouteId !== null || list.length === 0) return;
      const fromUrl = Number(this.routeId());
      this.chosenRouteId = list.some((r) => r.id === fromUrl) ? fromUrl : list[0].id;
    });
  }

  canSubmit() {
    const route = this.chosenRouteId ?? this.routes()[0]?.id;
    return !!route && (!!this.bus() || (this.searched() && this.results().length === 0 && this.plate.trim().length >= 2));
  }

  find() {
    const plate = this.plate.trim();
    if (plate.length < 2) return;
    this.api.searchBuses(plate).subscribe({
      next: (list) => {
        this.results.set(list);
        this.searched.set(true);
        const exact = list.find((b) => b.plate.replace(/\s/g, '') === plate.toUpperCase().replace(/\s/g, ''));
        if (exact) this.bus.set(exact);
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }

  submit() {
    const routeId = this.chosenRouteId ?? this.routes()[0]?.id;
    if (!routeId || !this.canSubmit()) return;
    this.busy.set(true);
    this.error.set('');

    const existing = this.bus();
    const bus$: Observable<Bus> = existing
      ? of(existing)
      : this.api.createBus({
          plate: this.plate.trim(),
          seatCount: Number(this.newSeats),
          type: this.newType || undefined,
          ownerName: this.newOwner || undefined,
          ownerPhone: this.newOwnerPhone || undefined,
        });

    bus$
      .pipe(
        switchMap((b) =>
          this.api.createTrip({
            routeId,
            busId: b.id,
            driverName: this.driverName || undefined,
            driverPhone: this.driverPhone || undefined,
            departureTime: this.departureTime ? timeToIso(this.departureTime) : undefined,
          }),
        ),
      )
      .subscribe({
        next: () => this.router.navigate(['/queue'], { queryParams: { routeId } }),
        error: (e) => {
          this.error.set(errorText(e));
          this.busy.set(false);
        },
      });
  }
}
