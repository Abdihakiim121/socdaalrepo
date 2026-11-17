import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { City } from '../core/api.types';
import { StationContextService } from '../core/station-context.service';
import { IconComponent } from '../shared/icon.component';

/** Admin only: the cities boosteejos are in and buses travel to. */
@Component({
  selector: 'app-settings-cities',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <div>
          <h1>Cities</h1>
          <p class="page-sub">Where boosteejos are, and where their buses go.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openNew()"><app-icon name="plus" />Add city</button>
        </div>
      </header>

      @if (error() && !form()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel">
        <div class="table-wrap">
          <table class="table">
            <thead><tr><th>City</th><th>Region</th><th class="num">Boosteejos</th><th><span class="sr">Edit</span></th></tr></thead>
            <tbody>
              @for (c of cities(); track c.id) {
                <tr>
                  <td class="strong">{{ c.name }}</td>
                  <td>{{ c.region || '—' }}</td>
                  <td class="num">{{ stationCount(c.id) }}</td>
                  <td class="num"><button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(c)"><app-icon name="edit" />Edit</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <div class="table-foot">{{ cities().length }} cities</div>
      </section>
    </div>

    @if (form(); as f) {
      <div class="sheet-backdrop" (click)="close()"></div>
      <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="city-sheet-title">
        <form class="sheet-form" (ngSubmit)="save()">
          <header class="sheet-header">
            <h2 id="city-sheet-title">{{ f.id ? 'Edit city' : 'Add city' }}</h2>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Close" (click)="close()"><app-icon name="close" /></button>
          </header>
          <div class="sheet-body">
            <div class="field"><label class="label" for="cname">City</label><input class="input" id="cname" name="cname" required [(ngModel)]="f.name"></div>
            <div class="field"><label class="label" for="cregion">Region <span class="muted">(optional)</span></label><input class="input" id="cregion" name="cregion" [(ngModel)]="f.region" placeholder="Banaadir"></div>
            @if (error()) {
              <div class="alert alert-error" role="alert">{{ error() }}</div>
            }
          </div>
          <footer class="sheet-footer">
            <button type="button" class="btn" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ f.id ? 'Save changes' : 'Add city' }}</button>
          </footer>
        </form>
      </aside>
    }
  `,
})
export class SettingsCitiesComponent {
  private readonly api = inject(ApiService);
  private readonly ctx = inject(StationContextService);

  readonly cities = signal<City[]>([]);
  readonly form = signal<{ id: number | null; name: string; region: string } | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    this.load();
    this.ctx.loadStations();
  }

  stationCount(cityId: number) {
    return this.ctx.stations().filter((s) => s.cityId === cityId).length;
  }

  openNew() {
    this.error.set('');
    this.form.set({ id: null, name: '', region: '' });
  }

  openEdit(c: City) {
    this.error.set('');
    this.form.set({ id: c.id, name: c.name, region: c.region ?? '' });
  }

  close() {
    this.form.set(null);
    this.error.set('');
  }

  save() {
    const f = this.form();
    if (!f) return;
    const body = { name: f.name.trim(), region: f.region.trim() || undefined };
    const call: Observable<City> = f.id ? this.api.updateCity(f.id, body) : this.api.createCity(body);
    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.load();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorText(e));
      },
    });
  }

  private load() {
    this.api.cities().subscribe({
      next: (list) => this.cities.set(list),
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
