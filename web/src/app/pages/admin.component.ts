import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { City, Route, Station, User } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { StationContextService } from '../core/station-context.service';

/** Admin only: cities, boosteejos and their routes, and manager accounts. */
@Component({
  selector: 'app-admin',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>{{ 'admin' | t }}</h1>
          <p class="page-sub">Cities, boosteejos, the routes they serve, and who can sign in.</p>
        </div>
      </header>

      @if (message()) {
        <div class="alert alert-success" role="status">{{ message() }}</div>
      }
      @if (error()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <!-- Boosteejos -->
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Boosteejos</h2>
            <p>Every bus station, with where it is and who to call.</p>
          </div>
          <span class="muted">{{ ctx.stations().length }} registered</span>
        </div>
        @if (ctx.stations().length > 0) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Boosteejo</th><th>City</th><th>Location</th><th>Contact</th><th>Hours</th><th>Destinations</th></tr></thead>
              <tbody>
                @for (s of ctx.stations(); track s.id) {
                  <tr>
                    <td class="strong">{{ s.name }}</td>
                    <td>{{ s.city?.name }}</td>
                    <td>{{ location(s) }}</td>
                    <td>{{ s.contactName || '—' }}@if (s.contactPhone) { <span class="muted">, {{ s.contactPhone }}</span> }</td>
                    <td>{{ s.openingHours || '—' }}</td>
                    <td>{{ routeNames(s.routes) }}</td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <form class="panel-body sub-form" (ngSubmit)="addStation()">
          <h3>Add a boosteejo</h3>
          <div class="form-grid">
            <div class="field">
              <label class="label" for="scity">City</label>
              <select class="select" id="scity" name="scity" required [(ngModel)]="station.cityId">
                @for (c of cities(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <div class="field"><label class="label" for="sname">Name</label><input class="input" id="sname" name="sname" required [(ngModel)]="station.name" placeholder="Garoowe boosteejo"></div>
            <div class="field"><label class="label" for="sdistrict">District</label><input class="input" id="sdistrict" name="sdistrict" [(ngModel)]="station.district"></div>
            <div class="field"><label class="label" for="slandmark">Landmark</label><input class="input" id="slandmark" name="slandmark" [(ngModel)]="station.landmark"></div>
            <div class="field"><label class="label" for="slat">Latitude</label><input class="input" id="slat" name="slat" type="number" step="any" [(ngModel)]="station.latitude"></div>
            <div class="field"><label class="label" for="slng">Longitude</label><input class="input" id="slng" name="slng" type="number" step="any" [(ngModel)]="station.longitude"></div>
            <div class="field"><label class="label" for="scontact">Contact name</label><input class="input" id="scontact" name="scontact" [(ngModel)]="station.contactName"></div>
            <div class="field"><label class="label" for="sphone">Contact phone</label><input class="input" id="sphone" name="sphone" type="tel" [(ngModel)]="station.contactPhone"></div>
            <div class="field"><label class="label" for="shours">Opening hours</label><input class="input" id="shours" name="shours" [(ngModel)]="station.openingHours" placeholder="5:00–18:00"></div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">Add boosteejo</button></div>
        </form>
      </section>

      <div class="two-col">
        <!-- Routes of the chosen boosteejo -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Routes from {{ ctx.station()?.name }}</h2>
              <p>Switch boosteejo in the sidebar to edit another.</p>
            </div>
          </div>
          <ul class="list">
            @for (r of ctx.station()?.routes ?? []; track r.id) {
              <li>
                <span>{{ ctx.station()?.city?.name }} → <strong>{{ r.destinationCity?.name }}</strong></span>
                <span class="list-end">
                  <span [class]="'status ' + (r.active ? 'status-active' : 'status-waiting')">{{ r.active ? 'Active' : 'Off' }}</span>
                  <button type="button" class="btn btn-sm" (click)="toggleRoute(r)">{{ r.active ? 'Turn off' : 'Turn on' }}</button>
                </span>
              </li>
            } @empty {
              <li class="muted">No routes yet.</li>
            }
          </ul>
          <form class="panel-body sub-form inline-form" (ngSubmit)="addRoute()">
            <div class="field">
              <label class="label" for="rdest">New destination</label>
              <select class="select" id="rdest" name="rdest" required [(ngModel)]="routeDestination">
                @for (c of destinations(); track c.id) { <option [ngValue]="c.id">{{ c.name }}</option> }
              </select>
            </div>
            <button class="btn" type="submit">Add route</button>
          </form>
        </section>

        <!-- Cities -->
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2>Cities</h2>
              <p>Where boosteejos are, and where buses go.</p>
            </div>
          </div>
          <div class="panel-body chips">
            @for (c of cities(); track c.id) { <span class="chip">{{ c.name }}</span> }
          </div>
          <form class="panel-body sub-form inline-form" (ngSubmit)="addCity()">
            <div class="field"><label class="label" for="cname">City</label><input class="input" id="cname" name="cname" required [(ngModel)]="city.name"></div>
            <div class="field"><label class="label" for="cregion">Region</label><input class="input" id="cregion" name="cregion" [(ngModel)]="city.region"></div>
            <button class="btn" type="submit">Add city</button>
          </form>
        </section>
      </div>

      <!-- Managers -->
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2>Managers</h2>
            <p>People who sign in to run a boosteejo.</p>
          </div>
        </div>
        @if (users().length > 0) {
          <div class="table-wrap">
            <table class="table">
              <thead><tr><th>Name</th><th>Phone</th><th>Role</th><th>Boosteejo</th><th>Access</th></tr></thead>
              <tbody>
                @for (u of users(); track u.id) {
                  <tr [class.row-dim]="!u.active">
                    <td class="strong">{{ u.name }}</td>
                    <td>+252 {{ u.phone }}</td>
                    <td>{{ u.role === 'admin' ? 'Admin' : 'Manager' }}</td>
                    <td>{{ u.station?.name || '—' }}</td>
                    <td>
                      <span [class]="'status ' + (u.active ? 'status-active' : 'status-waiting')">{{ u.active ? 'Can sign in' : 'Blocked' }}</span>
                      <button type="button" class="btn btn-sm" style="margin-left: 8px" (click)="toggleUser(u)">{{ u.active ? 'Block' : 'Allow' }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
        <form class="panel-body sub-form" (ngSubmit)="addUser()">
          <h3>Add a manager</h3>
          <div class="form-grid">
            <div class="field"><label class="label" for="uname">Name</label><input class="input" id="uname" name="uname" required [(ngModel)]="user.name"></div>
            <div class="field"><label class="label" for="uphone">Phone</label><input class="input" id="uphone" name="uphone" type="tel" required [(ngModel)]="user.phone"></div>
            <div class="field"><label class="label" for="upin">PIN</label><input class="input" id="upin" name="upin" inputmode="numeric" required minlength="4" maxlength="6" [(ngModel)]="user.pin"><span class="hint">4 to 6 digits. Give it to the manager in person.</span></div>
            <div class="field">
              <label class="label" for="ustation">Boosteejo</label>
              <select class="select" id="ustation" name="ustation" required [(ngModel)]="user.stationId">
                @for (s of ctx.stations(); track s.id) { <option [ngValue]="s.id">{{ s.name }}, {{ s.city?.name }}</option> }
              </select>
            </div>
          </div>
          <div class="form-actions"><button class="btn btn-primary" type="submit">Add manager</button></div>
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

  location(s: Station) {
    return [s.district, s.landmark].filter((x) => !!x).join(', ') || '—';
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
