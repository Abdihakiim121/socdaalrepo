import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { City, Station } from '../core/api.types';
import { StationContextService } from '../core/station-context.service';
import { IconComponent } from '../shared/icon.component';

interface StationForm {
  id: number | null;
  cityId: number | null;
  name: string;
  district: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
  contactName: string;
  contactPhone: string;
  openingHours: string;
  active: boolean;
}

/** Admin only: every boosteejo, where it is and who to call. */
@Component({
  selector: 'app-settings-stations',
  standalone: true,
  imports: [FormsModule, RouterLink, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>Boosteejos</h1>
          <p class="page-sub">Every bus station, where it is, and who to call there.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openNew()"><app-icon name="plus" />Add boosteejo</button>
        </div>
      </header>

      @if (error() && !form()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel">
        @if (ctx.stations().length === 0) {
          <div class="empty">
            <h3>No boosteejos yet</h3>
            <p>Add the first bus station, then the routes it serves and the manager who runs it.</p>
            <button type="button" class="btn" (click)="openNew()">Add boosteejo</button>
          </div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Boosteejo</th><th>City</th><th>Location</th><th>Contact</th><th>Hours</th><th>Destinations</th><th><span class="sr">Edit</span></th></tr>
              </thead>
              <tbody>
                @for (s of ctx.stations(); track s.id) {
                  <tr>
                    <td class="strong">{{ s.name }}</td>
                    <td>{{ s.city?.name }}</td>
                    <td>{{ location(s) }}</td>
                    <td>{{ s.contactName || '—' }}@if (s.contactPhone) { <span class="muted"> · +252 {{ s.contactPhone }}</span> }</td>
                    <td>{{ s.openingHours || '—' }}</td>
                    <td>
                      @if (s.routes?.length) {
                        <span class="tags">@for (r of s.routes; track r.id) { <span class="tag">{{ r.destinationCity?.name }}</span> }</span>
                      } @else {
                        <a routerLink="/settings/routes" (click)="ctx.choose(s.id)">Add routes</a>
                      }
                    </td>
                    <td class="num"><button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(s)"><app-icon name="edit" />Edit</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-foot">{{ ctx.stations().length }} boosteejos</div>
        }
      </section>
    </div>

    @if (form(); as f) {
      <div class="sheet-backdrop" (click)="close()"></div>
      <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="st-sheet-title">
        <form class="sheet-form" (ngSubmit)="save()">
          <header class="sheet-header">
            <h2 id="st-sheet-title">{{ f.id ? 'Edit boosteejo' : 'Add boosteejo' }}</h2>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Close" (click)="close()"><app-icon name="close" /></button>
          </header>
          <div class="sheet-body">
            <h3 class="sheet-section">Boosteejo</h3>
            <div class="field">
              <label class="label" for="fcity">City</label>
              <select class="select" id="fcity" name="fcity" required [(ngModel)]="f.cityId">
                @for (c of cities(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <div class="field">
              <label class="label" for="fname">Name</label>
              <input class="input" id="fname" name="fname" required [(ngModel)]="f.name" placeholder="Garoowe boosteejo">
            </div>

            <h3 class="sheet-section">Location</h3>
            <div class="field-row">
              <div class="field"><label class="label" for="fdistrict">District</label><input class="input" id="fdistrict" name="fdistrict" [(ngModel)]="f.district"></div>
              <div class="field"><label class="label" for="flandmark">Landmark</label><input class="input" id="flandmark" name="flandmark" [(ngModel)]="f.landmark"></div>
            </div>
            <div class="field-row">
              <div class="field"><label class="label" for="flat">Latitude</label><input class="input" id="flat" name="flat" type="number" step="any" [(ngModel)]="f.latitude"></div>
              <div class="field"><label class="label" for="flng">Longitude</label><input class="input" id="flng" name="flng" type="number" step="any" [(ngModel)]="f.longitude"></div>
            </div>
            <span class="hint">Optional. Used later to show passengers where the boosteejo is.</span>

            <h3 class="sheet-section">Contact</h3>
            <div class="field"><label class="label" for="fcontact">Contact name</label><input class="input" id="fcontact" name="fcontact" [(ngModel)]="f.contactName"></div>
            <div class="field">
              <label class="label" for="fphone">Contact phone</label>
              <div class="input-group"><span class="addon">+252</span><input class="input" id="fphone" name="fphone" type="tel" [(ngModel)]="f.contactPhone"></div>
            </div>
            <div class="field"><label class="label" for="fhours">Opening hours</label><input class="input" id="fhours" name="fhours" [(ngModel)]="f.openingHours" placeholder="5:00–18:00"></div>

            @if (f.id) {
              <label class="switch-row">
                <input type="checkbox" name="factive" [(ngModel)]="f.active">
                <span><span class="strong">Open</span><br><span class="hint">Turn off to hide a boosteejo that has closed. Its records are kept.</span></span>
              </label>
            }
            @if (error()) {
              <div class="alert alert-error" role="alert">{{ error() }}</div>
            }
          </div>
          <footer class="sheet-footer">
            <button type="button" class="btn" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ f.id ? 'Save changes' : 'Add boosteejo' }}</button>
          </footer>
        </form>
      </aside>
    }
  `,
})
export class SettingsStationsComponent {
  private readonly api = inject(ApiService);
  readonly ctx = inject(StationContextService);

  readonly cities = signal<City[]>([]);
  readonly form = signal<StationForm | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  constructor() {
    this.api.cities().subscribe((list) => this.cities.set(list));
    this.ctx.loadStations();
  }

  location(s: Station) {
    return [s.district, s.landmark].filter((x) => !!x).join(', ') || '—';
  }

  openNew() {
    this.error.set('');
    this.form.set({
      id: null, cityId: this.cities()[0]?.id ?? null, name: '', district: '', landmark: '',
      latitude: null, longitude: null, contactName: '', contactPhone: '', openingHours: '', active: true,
    });
  }

  openEdit(s: Station) {
    this.error.set('');
    this.form.set({
      id: s.id, cityId: s.cityId, name: s.name, district: s.district ?? '', landmark: s.landmark ?? '',
      latitude: s.latitude, longitude: s.longitude, contactName: s.contactName ?? '',
      contactPhone: s.contactPhone ?? '', openingHours: s.openingHours ?? '', active: s.active,
    });
  }

  close() {
    this.form.set(null);
    this.error.set('');
  }

  save() {
    const f = this.form();
    if (!f || !f.cityId) return;
    // Empty fields are left out rather than sent as blanks the API would reject.
    const body = {
      cityId: f.cityId,
      name: f.name.trim(),
      district: f.district.trim() || undefined,
      landmark: f.landmark.trim() || undefined,
      latitude: f.latitude ?? undefined,
      longitude: f.longitude ?? undefined,
      contactName: f.contactName.trim() || undefined,
      contactPhone: f.contactPhone.trim() || undefined,
      openingHours: f.openingHours.trim() || undefined,
    };
    const call: Observable<Station> = f.id
      ? this.api.updateStation(f.id, { ...body, active: f.active } as Partial<Station>)
      : this.api.createStation(body as Partial<Station> & { cityId: number; name: string });

    this.busy.set(true);
    call.subscribe({
      next: () => {
        this.busy.set(false);
        this.close();
        this.ctx.loadStations();
        this.ctx.refresh();
      },
      error: (e) => {
        this.busy.set(false);
        this.error.set(errorText(e));
      },
    });
  }
}
