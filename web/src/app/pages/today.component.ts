import { Component, DestroyRef, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { ApiService, errorText } from '../core/api.service';
import { TodayResponse } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';

@Component({
  selector: 'app-today',
  standalone: true,
  imports: [RouterLink, TranslatePipe],
  template: `
    <div class="page">
      <div class="page-head">
        <div>
          <h1>{{ 'today' | t }}</h1>
          <span class="muted">{{ data()?.station?.name }} · {{ data()?.date }}</span>
        </div>
        <a class="btn btn-primary" routerLink="/buses/arrival">{{ 'registerBus' | t }}</a>
      </div>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (data(); as d) {
        <div class="grid">
          <div class="card stat"><span class="muted small">{{ 'busesInQueue' | t }}</span><strong>{{ d.totals.busesInQueue }}</strong></div>
          <div class="card stat"><span class="muted small">{{ 'departedToday' | t }}</span><strong>{{ d.totals.departedToday }}</strong></div>
          <div class="card stat"><span class="muted small">{{ 'passengersToday' | t }}</span><strong>{{ d.totals.passengersToday }}</strong></div>
        </div>

        <div class="card">
          <h2>{{ 'routes' | t }}</h2>
          @if (d.routes.length === 0) {
            <p class="muted">{{ 'noRoutes' | t }}</p>
          } @else {
            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>{{ 'route' | t }}</th>
                    <th>{{ 'busesInQueue' | t }}</th>
                    <th>{{ 'departedToday' | t }}</th>
                    <th>{{ 'passengersToday' | t }}</th>
                    <th><span class="sr">{{ 'open' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of d.routes; track r.routeId) {
                    <tr>
                      <td><strong>→ {{ r.destination }}</strong></td>
                      <td>{{ r.busesInQueue }}</td>
                      <td>{{ r.departedToday }}</td>
                      <td>{{ r.passengersToday }}</td>
                      <td><a [routerLink]="['/queue']" [queryParams]="{ routeId: r.routeId }">{{ 'queue' | t }}</a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </div>
      }
    </div>
  `,
})
export class TodayComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);

  readonly data = signal<TodayResponse | null>(null);
  readonly error = signal('');

  constructor() {
    effect(() => {
      const id = this.ctx.stationId();
      if (id) this.load(id);
    });
    inject(LiveService)
      .on()
      .pipe(takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => {
        const id = this.ctx.stationId();
        if (id) this.load(id);
      });
  }

  private load(stationId: number) {
    this.api.today(stationId).subscribe({
      next: (d) => {
        this.data.set(d);
        this.error.set('');
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
