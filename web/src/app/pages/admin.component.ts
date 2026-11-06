import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { City, Route, User } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';

/** Admin only: cities, boosteejos and their routes, and manager accounts. */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="page">
      <h1>{{ 'admin' | t }}</h1>

      @if (message()) {
        <div class="alert alert-ok" role="status">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <!-- Cities -->
      <section class="card stack">
        <h2>Cities</h2>
        <div class="row">
          @for (c of cities(); track c.id) { <span class="pill">{{ c.name }}</span> }
        </div>
        <form class="form-grid" (ngSubmit)="addCity()">
          <div class="field"><label for="cname">City name</label><input id="cname" name="cname" required [(ngModel)]="city.name"></div>
          <div class="field"><label for="cregion">Region</label><input id="cregion" name="cregion" [(ngModel)]="city.region"></div>
          <button class="btn" type="submit">Add city</button>
        </form>
      </section>

      <!-- Boosteejos -->
      <section class="card stack">
        <h2>Boosteejos</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>City</th><th>Boosteejo</th><th>District / landmark</th><th>Contact</th><th>Hours</th><th>Routes</th></tr></thead>
            <tbody>
              @for (s of ctx.stations(); track s.id) {
                <tr>
                  <td>{{ s.city?.name }}</td>
                  <td><strong>{{ s.name }}</strong></td>
                  <td>{{ s.district || '—' }}{{ s.landmark ? ' · ' + s.landmark : '' }}</td>
                  <td>{{ s.contactName || '—' }}{{ s.contactPhone ? ' · ' + s.contactPhone : '' }}</td>
                  <td>{{ s.openingHours || '—' }}</td>
                  <td>{{ routeNames(s.routes) }}</td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <form class="stack" (ngSubmit)="addStation()">
          <h3>Add a boosteejo</h3>
          <div class="form-grid">
            <div class="field">
              <label for="scity">City</label>
              <select id="scity" name="scity" required [(ngModel)]="station.cityId">
                @for (c of cities(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <div class="field"><label for="sname">Name</label><input id="sname" name="sname" required [(ngModel)]="station.name" placeholder="Garoowe boosteejo"></div>
            <div class="field"><label for="sdistrict">District</label><input id="sdistrict" name="sdistrict" [(ngModel)]="station.district"></div>
            <div class="field"><label for="slandmark">Landmark</label><input id="slandmark" name="slandmark" [(ngModel)]="station.landmark"></div>
            <div class="field"><label for="slat">Latitude</label><input id="slat" name="slat" type="number" step="any" [(ngModel)]="station.latitude"></div>
            <div class="field"><label for="slng">Longitude</label><input id="slng" name="slng" type="number" step="any" [(ngModel)]="station.longitude"></div>
            <div class="field"><label for="scontact">Contact name</label><input id="scontact" name="scontact" [(ngModel)]="station.contactName"></div>
            <div class="field"><label for="sphone">Contact phone</label><input id="sphone" name="sphone" type="tel" [(ngModel)]="station.contactPhone"></div>
            <div class="field"><label for="shours">Opening hours</label><input id="shours" name="shours" [(ngModel)]="station.openingHours" placeholder="5:00–18:00"></div>
            <button class="btn btn-primary" type="submit">Add boosteejo</button>
          </div>
        </form>
      </section>

      <!-- Routes of the chosen boosteejo -->
      <section class="card stack">
        <h2>Routes from {{ ctx.station()?.name }}</h2>
        <p class="muted small">Choose the boosteejo in the top bar.</p>
        @for (r of ctx.station()?.routes ?? []; track r.id) {
          <div class="row spread">
            <span>→ {{ r.destinationCity?.name }}</span>
            <button type="button" class="btn" (click)="toggleRoute(r)">{{ r.active ? 'Turn off' : 'Turn on' }}</button>
          </div>
        }
        <form class="row" (ngSubmit)="addRoute()">
          <div class="field grow">
            <label for="rdest">Destination</label>
            <select id="rdest" name="rdest" required [(ngModel)]="routeDestination">
              @for (c of destinations(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
            </select>
          </div>
          <button class="btn" type="submit" style="align-self: flex-end">Add route</button>
        </form>
      </section>

      <!-- Managers -->
      <section class="card stack">
        <h2>Managers</h2>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Boosteejo</th><th>Active</th></tr></thead>
            <tbody>
              @for (u of users(); track u.id) {
                <tr>
                  <td>{{ u.name }}</td>
                  <td>{{ u.phone }}</td>
                  <td>{{ u.role }}</td>
                  <td>{{ u.station?.name || '—' }}</td>
                  <td><button type="button" class="btn" (click)="toggleUser(u)">{{ u.active ? 'Active' : 'Off' }}</button></td>
                </tr>
              }
            </tbody>
          </table>
        </div>
        <form class="form-grid" (ngSubmit)="addUser()">
          <div class="field"><label for="uname">Name</label><input id="uname" name="uname" required [(ngModel)]="user.name"></div>
          <div class="field"><label for="uphone">Phone</label><input id="uphone" name="uphone" type="tel" required [(ngModel)]="user.phone"></div>
          <div class="field"><label for="upin">PIN (4–6 digits)</label><input id="upin" name="upin" inputmode="numeric" required minlength="4" maxlength="6" [(ngModel)]="user.pin"></div>
          <div class="field">
            <label for="ustation">Boosteejo</label>
            <select id="ustation" name="ustation" required [(ngModel)]="user.stationId">
              @for (s of ctx.stations(); track s.id) { <option [ngValue]="s.id">{{ s.city?.name }} · {{ s.name }}</option> }
            </select>
          </div>
          <button class="btn btn-primary" type="submit">Add manager</button>
        </form>
      </section>
    </div>
  `,
})
export class AdminComponent {
  private readonly api = inject(ApiService);
  readonly ctx = inject(StationContextService);

  readonly cities = signal<City[]>([]);
  readonly users = signal<User[]>([]);
  readonly message = signal('');
  readonly error = signal('');

  /** Cities a route can go to: every city except the boosteejo's own. */
  readonly destinations = computed(() => this.cities().filter((c) => c.id !== this.ctx.station()?.cityId));

  city = { name: '', region: '' };
  station = this.emptyStation();
  routeDestination: number | null = null;
  user = { name: '', phone: '', pin: '', stationId: null as number | null };

  constructor() {
    this.loadCities();
    this.loadUsers();
  }

  routeNames(routes: Route[] | undefined) {
    return (routes ?? []).map((r) => r.destinationCity?.name).join(', ') || '—';
  }

  addCity() {
    this.run(this.api.createCity({ name: this.city.name.trim(), region: this.city.region.trim() || undefined }), 'City added', () => {
      this.city = { name: '', region: '' };
      this.loadCities();
    });
  }

  addStation() {
    const s = this.station;
    if (!s.cityId) return;
    this.run(
      this.api.createStation({
        cityId: s.cityId,
        name: s.name.trim(),
        district: s.district || null,
        landmark: s.landmark || null,
        latitude: s.latitude,
        longitude: s.longitude,
        contactName: s.contactName || null,
        contactPhone: s.contactPhone || null,
        openingHours: s.openingHours || null,
      }),
      'Boosteejo added',
      () => {
        this.station = this.emptyStation();
        this.ctx.loadStations();
      },
    );
  }

  addRoute() {
    const stationId = this.ctx.stationId();
    if (!stationId || !this.routeDestination) return;
    this.run(this.api.createRoute(stationId, this.routeDestination), 'Route added', () => {
      this.routeDestination = null;
      this.ctx.refresh();
      this.ctx.loadStations();
    });
  }

  toggleRoute(r: Route) {
    this.run(this.api.setRouteActive(r.id, !r.active), r.active ? 'Route turned off' : 'Route turned on', () => {
      this.ctx.refresh();
      this.ctx.loadStations();
    });
  }

  addUser() {
    const u = this.user;
    if (!u.stationId) return;
    this.run(
      this.api.createUser({ name: u.name.trim(), phone: u.phone.trim(), pin: u.pin, role: 'manager', stationId: u.stationId }),
      'Manager added',
      () => {
        this.user = { name: '', phone: '', pin: '', stationId: null };
        this.loadUsers();
      },
    );
  }

  toggleUser(u: User) {
    this.run(this.api.updateUser(u.id, { active: !u.active }), 'Saved', () => this.loadUsers());
  }

  private run(call: Observable<unknown>, ok: string, after: () => void) {
    this.message.set('');
    this.error.set('');
    call.subscribe({
      next: () => {
        this.message.set(ok);
        after();
      },
      error: (e: unknown) => this.error.set(errorText(e)),
    });
  }

  private loadCities() {
    this.api.cities().subscribe((list) => this.cities.set(list));
  }

  private loadUsers() {
    this.api.users().subscribe((list) => this.users.set(list));
  }

  private emptyStation() {
    return {
      cityId: null as number | null,
      name: '',
      district: '',
      landmark: '',
      latitude: null as number | null,
      longitude: null as number | null,
      contactName: '',
      contactPhone: '',
      openingHours: '',
    };
  }
}
