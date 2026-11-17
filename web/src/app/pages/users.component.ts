import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { User, UserRole } from '../core/api.types';
import { StationContextService } from '../core/station-context.service';
import { IconComponent } from '../shared/icon.component';

interface UserForm {
  id: number | null;
  name: string;
  phone: string;
  role: UserRole;
  stationId: number | null;
  pin: string;
  active: boolean;
}

/** Admin only: who can sign in, as what, and at which boosteejo. */
@Component({
  selector: 'app-users',
  standalone: true,
  imports: [FormsModule, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>User management</h1>
          <p class="page-sub">Admins manage every boosteejo. Managers run one boosteejo and only see its data.</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openNew()"><app-icon name="plus" />Add user</button>
        </div>
      </header>

      @if (error() && !form()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel stats">
        <div class="stat"><span class="stat-label">Users</span><span class="stat-value">{{ users().length }}</span></div>
        <div class="stat"><span class="stat-label">Managers</span><span class="stat-value">{{ managerCount() }}</span></div>
        <div class="stat"><span class="stat-label">Blocked</span><span class="stat-value">{{ blockedCount() }}</span></div>
      </section>

      <section class="panel">
        <div class="toolbar">
          <div class="field grow">
            <label class="label" for="uq">Name or phone</label>
            <div class="input-icon">
              <app-icon name="search" />
              <input class="input" id="uq" [ngModel]="q()" (ngModelChange)="q.set($event)" placeholder="Search users" autocomplete="off">
            </div>
          </div>
          <div class="field">
            <label class="label" for="urole">Role</label>
            <select class="select" id="urole" [ngModel]="role()" (ngModelChange)="role.set($event)">
              <option value="">All roles</option>
              <option value="admin">Admin</option>
              <option value="manager">Manager</option>
            </select>
          </div>
          <div class="field">
            <label class="label" for="ustation">Boosteejo</label>
            <select class="select" id="ustation" [ngModel]="stationFilter()" (ngModelChange)="stationFilter.set($event)">
              <option [ngValue]="null">All boosteejos</option>
              @for (s of ctx.stations(); track s.id) { <option [ngValue]="s.id">{{ s.name }}</option> }
            </select>
          </div>
        </div>

        @if (filtered().length === 0) {
          <div class="empty"><p>No users match these filters.</p></div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr><th>Name</th><th>Phone</th><th>Role</th><th>Boosteejo</th><th>Access</th><th><span class="sr">Edit</span></th></tr>
              </thead>
              <tbody>
                @for (u of filtered(); track u.id) {
                  <tr [class.row-dim]="!u.active">
                    <td>
                      <span class="person">
                        <span class="avatar-sm" aria-hidden="true">{{ initials(u.name) }}</span>
                        <span class="strong">{{ u.name }}</span>
                      </span>
                    </td>
                    <td>+252 {{ u.phone }}</td>
                    <td><span class="tag" [class.tag-teal]="u.role === 'admin'">{{ u.role === 'admin' ? 'Admin' : 'Manager' }}</span></td>
                    <td>{{ u.station ? u.station.name + ', ' + (u.station.city?.name ?? '') : '—' }}</td>
                    <td><span [class]="'status ' + (u.active ? 'status-active' : 'status-cancelled')">{{ u.active ? 'Can sign in' : 'Blocked' }}</span></td>
                    <td class="num"><button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(u)"><app-icon name="edit" />Edit</button></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-foot">{{ filtered().length }} of {{ users().length }} users</div>
        }
      </section>
    </div>

    @if (form(); as f) {
      <div class="sheet-backdrop" (click)="close()"></div>
      <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="user-sheet-title">
        <form class="sheet-form" (ngSubmit)="save()">
          <header class="sheet-header">
            <h2 id="user-sheet-title">{{ f.id ? 'Edit user' : 'Add user' }}</h2>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" aria-label="Close" (click)="close()"><app-icon name="close" /></button>
          </header>
          <div class="sheet-body">
            <div class="field">
              <label class="label" for="fname">Full name</label>
              <input class="input" id="fname" name="fname" required [(ngModel)]="f.name">
            </div>
            <div class="field">
              <label class="label" for="fphone">Phone number</label>
              <div class="input-group"><span class="addon">+252</span><input class="input" id="fphone" name="fphone" type="tel" required [(ngModel)]="f.phone"></div>
              <span class="hint">They sign in with this number.</span>
            </div>
            <div class="field">
              <span class="label" id="frole-label">Role</span>
              <div class="segmented full" role="radiogroup" aria-labelledby="frole-label">
                <button type="button" role="radio" [class.on]="f.role === 'manager'" [attr.aria-checked]="f.role === 'manager'" [disabled]="!!f.id" (click)="f.role = 'manager'">Manager</button>
                <button type="button" role="radio" [class.on]="f.role === 'admin'" [attr.aria-checked]="f.role === 'admin'" [disabled]="!!f.id" (click)="f.role = 'admin'">Admin</button>
              </div>
              @if (f.id) { <span class="hint">The role is set when the user is added.</span> }
            </div>
            @if (f.role === 'manager') {
              <div class="field">
                <label class="label" for="fstation">Boosteejo</label>
                <select class="select" id="fstation" name="fstation" required [(ngModel)]="f.stationId">
                  @for (s of ctx.stations(); track s.id) { <option [ngValue]="s.id">{{ s.name }}, {{ s.city?.name }}</option> }
                </select>
              </div>
            }
            <div class="field">
              <label class="label" for="fpin">{{ f.id ? 'New PIN' : 'PIN' }} @if (f.id) { <span class="muted">(optional)</span> }</label>
              <input class="input" id="fpin" name="fpin" inputmode="numeric" autocomplete="off" minlength="4" maxlength="6"
                     [required]="!f.id" [(ngModel)]="f.pin">
              <span class="hint">4 to 6 digits. Give it to the person directly, not by message.</span>
            </div>
            @if (f.id) {
              <label class="switch-row">
                <input type="checkbox" name="factive" [(ngModel)]="f.active">
                <span><span class="strong">Can sign in</span><br><span class="hint">Turn off to block this user without deleting their records.</span></span>
              </label>
            }
            @if (error()) {
              <div class="alert alert-error" role="alert">{{ error() }}</div>
            }
          </div>
          <footer class="sheet-footer">
            <button type="button" class="btn" (click)="close()">Cancel</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ f.id ? 'Save changes' : 'Add user' }}</button>
          </footer>
        </form>
      </aside>
    }
  `,
})
export class UsersComponent {
  private readonly api = inject(ApiService);
  readonly ctx = inject(StationContextService);

  readonly users = signal<User[]>([]);
  readonly form = signal<UserForm | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');

  readonly q = signal('');
  readonly role = signal<'' | UserRole>('');
  readonly stationFilter = signal<number | null>(null);

  readonly filtered = computed(() => {
    const q = this.q().trim().toLowerCase();
    const digits = q.replace(/\D/g, '');
    return this.users().filter(
      (u) =>
        (!q || u.name.toLowerCase().includes(q) || (!!digits && u.phone.includes(digits))) &&
        (!this.role() || u.role === this.role()) &&
        (this.stationFilter() === null || u.stationId === this.stationFilter()),
    );
  });
  readonly managerCount = computed(() => this.users().filter((u) => u.role === 'manager').length);
  readonly blockedCount = computed(() => this.users().filter((u) => !u.active).length);

  constructor() {
    this.load();
  }

  initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join('');
  }

  openNew() {
    this.error.set('');
    this.form.set({ id: null, name: '', phone: '', role: 'manager', stationId: this.ctx.stationId(), pin: '', active: true });
  }

  openEdit(u: User) {
    this.error.set('');
    this.form.set({ id: u.id, name: u.name, phone: u.phone, role: u.role, stationId: u.stationId, pin: '', active: u.active ?? true });
  }

  close() {
    this.form.set(null);
    this.error.set('');
  }

  save() {
    const f = this.form();
    if (!f) return;
    if (f.role === 'manager' && !f.stationId) {
      this.error.set('Choose the boosteejo this manager works at.');
      return;
    }
    const call: Observable<User> = f.id
      ? this.api.updateUser(f.id, {
          name: f.name.trim(),
          phone: f.phone.trim(),
          pin: f.pin || undefined,
          stationId: f.role === 'manager' ? f.stationId ?? undefined : undefined,
          active: f.active,
        })
      : this.api.createUser({
          name: f.name.trim(),
          phone: f.phone.trim(),
          pin: f.pin,
          role: f.role,
          stationId: f.role === 'manager' ? f.stationId ?? undefined : undefined,
        });

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
    this.api.users().subscribe({
      next: (list) => this.users.set(list),
      error: (e) => this.error.set(errorText(e)),
    });
  }
}
