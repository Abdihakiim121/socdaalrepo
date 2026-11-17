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
      <header class="page-header">
        <div>
          <h1>{{ 'today' | t }}</h1>
          <p class="page-sub">{{ 'todaySub' | t }}{{ data() ? ', ' + data()!.date : '' }}</p>
        </div>
        <div class="page-actions">
          <a class="btn btn-primary" routerLink="/buses/arrival">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
            {{ 'registerBus' | t }}
          </a>
        </div>
      </header>

      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      @if (data(); as d) {
        <section class="panel stats">
          <div class="stat"><span class="stat-label">{{ 'busesInQueue' | t }}</span><span class="stat-value">{{ d.totals.busesInQueue }}</span></div>
          <div class="stat"><span class="stat-label">{{ 'departedToday' | t }}</span><span class="stat-value">{{ d.totals.departedToday }}</span></div>
          <div class="stat"><span class="stat-label">{{ 'passengersToday' | t }}</span><span class="stat-value">{{ d.totals.passengersToday }}</span></div>
        </section>

        <section class="panel">
          <div class="panel-header"><h2>{{ 'routes' | t }}</h2></div>
          @if (d.routes.length === 0) {
            <div class="empty"><p>{{ 'noRoutes' | t }}</p></div>
          } @else {
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>{{ 'route' | t }}</th>
                    <th class="num">{{ 'busesInQueue' | t }}</th>
                    <th class="num">{{ 'departedToday' | t }}</th>
                    <th class="num">{{ 'passengersToday' | t }}</th>
                    <th><span class="sr">{{ 'open' | t }}</span></th>
                  </tr>
                </thead>
                <tbody>
                  @for (r of d.routes; track r.routeId) {
                    <tr>
                      <td class="strong">{{ d.station.city }} → {{ r.destination }}</td>
                      <td class="num">{{ r.busesInQueue }}</td>
                      <td class="num">{{ r.departedToday }}</td>
                      <td class="num">{{ r.passengersToday }}</td>
                      <td class="num"><a class="btn btn-sm" [routerLink]="['/queue']" [queryParams]="{ routeId: r.routeId }">{{ 'queue' | t }}</a></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
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
