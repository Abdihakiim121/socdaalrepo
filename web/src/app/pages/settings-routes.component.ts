import { Component, computed, effect, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, errorText } from '../core/api.service';
import { City, Route } from '../core/api.types';
import { StationContextService } from '../core/station-context.service';
import { IconComponent } from '../shared/icon.component';

/** Admin only: the destinations each boosteejo serves. */
@Component({
  selector: 'app-settings-routes',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Routes</h1>
          <p class="page-sub">The destinations each boosteejo sends buses to. Managers only see active routes.</p>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <div class="split">
        <section class="panel">
          <div class="panel-header"><h2>Boosteejo</h2></div>
          <div class="pick-list" role="listbox" aria-label="Boosteejo">
            @for (s of ctx.stations(); track s.id) {
              <button type="button" role="option" class="pick" [class.on]="s.id === stationId()" [attr.aria-selected]="s.id === stationId()" (click)="stationId.set(s.id)">
                <span class="pick-text"><span class="strong">{{ s.name }}</span><span class="muted">{{ s.city?.name }}</span></span>
                <span class="pick-count">{{ s.routes?.length ?? 0 }}</span>
              </button>
            }
          </div>
        </section>

        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>From {{ station()?.name }}</h2>
              <p>{{ station()?.city?.name }} to:</p>
            </div>
          </div>
          @if (routes().length === 0) {
            <div class="empty"><p>No routes yet. Add the first destination below.</p></div>
          } @else {
            <ul class="list">
              @for (r of routes(); track r.id) {
                <li>
                  <span class="route-name">
                    <app-icon name="signpost" />
                    <span class="strong">{{ r.destinationCity?.name }}</span>
                  </span>
                  <span class="list-end">
                    <span [class]="'status ' + (r.active ? 'status-active' : 'status-waiting')">{{ r.active ? 'Active' : 'Off' }}</span>
                    <button type="button" class="btn btn-sm" (click)="toggle(r)">{{ r.active ? 'Turn off' : 'Turn on' }}</button>
                  </span>
                </li>
              }
            </ul>
          }
          <form class="panel-body sub-form inline-form" (ngSubmit)="add()">
            <div class="field">
              <label class="label" for="rdest">Add a destination</label>
              <select class="select" id="rdest" name="rdest" required [(ngModel)]="destination">
                <option [ngValue]="null" disabled>Choose a city</option>
                @for (c of destinations(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <button class="btn btn-primary" type="submit" [disabled]="!destination"><app-icon name="plus" />Add route</button>
          </form>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .split { display: grid; grid-template-columns: minmax(240px, 320px) 1fr; gap: 20px; align-items: start; }
    @media (max-width: 860px) { .split { grid-template-columns: 1fr; } }
    .pick-list { display: flex; flex-direction: column; padding: 6px; gap: 2px; }
    .pick { display: flex; align-items: center; gap: 10px; padding: 10px 12px; border: none; border-radius: 8px; background: transparent; font: inherit; color: var(--ink); text-align: left; cursor: pointer; }
    .pick:hover { background: var(--canvas); }
    .pick.on { background: var(--side-active); }
    .pick-text { flex: 1; display: flex; flex-direction: column; line-height: 1.35; }
    .pick-text .muted { font-size: 12.5px; }
    .pick-count { font-size: 12px; color: var(--muted); background: var(--canvas); border-radius: 999px; padding: 1px 8px; }
    .route-name { display: inline-flex; align-items: center; gap: 10px; }
    .route-name app-icon { color: var(--icon); }
  `],
})
export class SettingsRoutesComponent {
  private readonly api = inject(ApiService);
  readonly ctx = inject(StationContextService);

  readonly cities = signal<City[]>([]);
  readonly routes = signal<Route[]>([]);
  readonly stationId = signal<number | null>(this.ctx.stationId());
  readonly error = signal('');
  destination: number | null = null;

  readonly station = computed(() => this.ctx.stations().find((s) => s.id === this.stationId()) ?? null);
  readonly destinations = computed(() => {
    const taken = new Set(this.routes().map((r) => r.destinationCityId));
    return this.cities().filter((c) => c.id !== this.station()?.cityId && !taken.has(c.id));
  });

  constructor() {
    this.api.cities().subscribe((list) => this.cities.set(list));
    this.ctx.loadStations();
    effect(
      () => {
        if (this.stationId() === null && this.ctx.stations().length) this.stationId.set(this.ctx.stations()[0].id);
        const id = this.stationId();
        if (id) this.load(id);
      },
      { allowSignalWrites: true },
    );
  }

  add() {
    const id = this.stationId();
    if (!id || !this.destination) return;
    this.api.createRoute(id, this.destination).subscribe({
      next: () => {
        this.destination = null;
        this.afterChange(id);
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }

  toggle(r: Route) {
    this.api.setRouteActive(r.id, !r.active).subscribe({
      next: () => this.afterChange(r.stationId),
      error: (e) => this.error.set(errorText(e)),
    });
  }

  private afterChange(stationId: number) {
    this.error.set('');
    this.load(stationId);
    this.ctx.loadStations();
    this.ctx.refresh();
  }

  private load(stationId: number) {
    this.api.routes(stationId).subscribe({
      next: (list) => this.routes.set(list),
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
