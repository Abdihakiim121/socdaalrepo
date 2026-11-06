import { Component, computed, effect, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
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
  imports: [FormsModule, RouterLink, TranslatePipe],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <div>
          <a class="crumb" routerLink="/queue">{{ 'queue' | t }}</a>
          <h1>{{ 'registerBus' | t }}</h1>
        </div>
      </header>

      <form class="stack" (ngSubmit)="submit()">
        <section class="panel">
          <div class="panel-header"><h2>{{ 'route' | t }}</h2></div>
          <div class="panel-body">
            <div class="field">
              <label class="label" for="route">{{ 'route' | t }}</label>
              <select class="select" id="route" name="route" required [(ngModel)]="chosenRouteId">
                @for (r of routes(); track r.id) {
                  <option [ngValue]="r.id">{{ ctx.station()?.city?.name }} → {{ r.destinationCity?.name }}</option>
                }
              </select>
            </div>
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>{{ 'findBus' | t }}</h2>
              <p>{{ 'findBusHint' | t }}</p>
            </div>
          </div>
          <div class="panel-body stack">
            @if (bus(); as b) {
              <div class="picked">
                <span class="plate">{{ b.plate }}</span>
                <span class="muted">{{ b.type || ('bus' | t) }}, {{ b.seatCount }} {{ 'seats' | t }}</span>
                <button type="button" class="btn btn-sm" (click)="bus.set(null)">{{ 'change' | t }}</button>
              </div>
            } @else {
              <div class="search-row">
                <div class="field">
                  <label class="label" for="plate">{{ 'plate' | t }}</label>
                  <input class="input" id="plate" name="plate" [(ngModel)]="plate" (keydown.enter)="$event.preventDefault(); find()" placeholder="BN 4127" autocomplete="off">
                </div>
                <button type="button" class="btn" (click)="find()">{{ 'search' | t }}</button>
              </div>

              @if (results().length > 0) {
                <div class="results">
                  @for (b of results(); track b.id) {
                    <button type="button" class="result" (click)="bus.set(b)">
                      <span class="plate">{{ b.plate }}</span>
                      <span class="muted">{{ b.type || '' }}</span>
                      <span class="muted seats">{{ b.seatCount }} {{ 'seats' | t }}</span>
                    </button>
                  }
                </div>
              }

              @if (searched() && results().length === 0) {
                <div class="alert alert-success" role="status">{{ 'notFoundNewBus' | t }}</div>
                <div class="form-grid">
                  <div class="field">
                    <label class="label" for="seats">{{ 'seats' | t }}</label>
                    <input class="input" id="seats" name="seats" type="number" min="1" max="100" required [(ngModel)]="newSeats">
                  </div>
                  <div class="field">
                    <label class="label" for="type">{{ 'busType' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
                    <input class="input" id="type" name="type" [(ngModel)]="newType" placeholder="Coaster">
                  </div>
                  <div class="field">
                    <label class="label" for="owner">{{ 'owner' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
                    <input class="input" id="owner" name="owner" [(ngModel)]="newOwner">
                  </div>
                  <div class="field">
                    <label class="label" for="ownerPhone">{{ 'ownerPhone' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
                    <input class="input" id="ownerPhone" name="ownerPhone" type="tel" [(ngModel)]="newOwnerPhone">
                  </div>
                </div>
              }
            }
          </div>
        </section>

        <section class="panel">
          <div class="panel-header"><h2>{{ 'tripDetails' | t }}</h2></div>
          <div class="panel-body form-grid">
            <div class="field">
              <label class="label" for="driver">{{ 'driver' | t }}</label>
              <input class="input" id="driver" name="driver" [(ngModel)]="driverName">
            </div>
            <div class="field">
              <label class="label" for="driverPhone">{{ 'driverPhone' | t }}</label>
              <input class="input" id="driverPhone" name="driverPhone" type="tel" [(ngModel)]="driverPhone">
            </div>
            <div class="field">
              <label class="label" for="time">{{ 'departureTime' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
              <input class="input" id="time" name="time" type="time" [(ngModel)]="departureTime">
            </div>
          </div>
        </section>

        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }
        <div class="form-actions">
          <a class="btn" routerLink="/queue">{{ 'cancel' | t }}</a>
          <button class="btn btn-primary" type="submit" [disabled]="busy() || !canSubmit()">{{ 'addToQueue' | t }}</button>
        </div>
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
