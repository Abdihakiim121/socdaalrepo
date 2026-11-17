import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { ApiService, errorText } from '../core/api.service';
import { Bus } from '../core/api.types';
import { TranslatePipe } from '../core/i18n';
import { IconComponent } from '../shared/icon.component';

interface BusForm {
  id: number | null;
  plate: string;
  seatCount: number;
  type: string;
  ownerName: string;
  ownerPhone: string;
}

/** Every bus ever registered. A bus is added once and can join the queue at any boosteejo. */
@Component({
  selector: 'app-buses',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IconComponent],
  template: `
    <div class="page">
      <header class="page-header">
        <div>
          <h1>{{ 'buses' | t }}</h1>
          <p class="page-sub">{{ 'busesSub' | t }}</p>
        </div>
        <div class="page-actions">
          <button type="button" class="btn btn-primary" (click)="openNew()"><app-icon name="plus" />{{ 'addBus' | t }}</button>
        </div>
      </header>

      @if (error() && !form()) {
        <div class="alert alert-error" role="alert">{{ error() }}</div>
      }

      <section class="panel">
        <form class="toolbar" (ngSubmit)="load()">
          <div class="field grow">
            <label class="label" for="bq">{{ 'plate' | t }}</label>
            <div class="input-icon">
              <app-icon name="search" />
              <input class="input" id="bq" name="bq" [(ngModel)]="plate" placeholder="BN 4127" autocomplete="off">
            </div>
          </div>
          <button class="btn" type="submit">{{ 'search' | t }}</button>
        </form>

        @if (buses().length === 0) {
          <div class="empty"><p>{{ plate.trim() ? ('noResults' | t) : ('noBusesYet' | t) }}</p></div>
        } @else {
          <div class="table-wrap">
            <table class="table">
              <thead>
                <tr>
                  <th>{{ 'plate' | t }}</th>
                  <th>{{ 'busType' | t }}</th>
                  <th class="num">{{ 'seats' | t }}</th>
                  <th>{{ 'owner' | t }}</th>
                  <th>{{ 'ownerPhone' | t }}</th>
                  <th><span class="sr">{{ 'edit' | t }}</span></th>
                </tr>
              </thead>
              <tbody>
                @for (b of buses(); track b.id) {
                  <tr>
                    <td><span class="plate">{{ b.plate }}</span></td>
                    <td>{{ b.type || '—' }}</td>
                    <td class="num">{{ b.seatCount }}</td>
                    <td>{{ b.ownerName || '—' }}</td>
                    <td>{{ b.ownerPhone ? '+252 ' + b.ownerPhone : '—' }}</td>
                    <td class="num">
                      <button type="button" class="btn btn-ghost btn-sm" (click)="openEdit(b)"><app-icon name="edit" />{{ 'edit' | t }}</button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
          <div class="table-foot">{{ buses().length }} {{ 'buses' | t }}</div>
        }
      </section>
    </div>

    @if (form(); as f) {
      <div class="sheet-backdrop" (click)="close()"></div>
      <aside class="sheet" role="dialog" aria-modal="true" aria-labelledby="bus-sheet-title">
        <form class="sheet-form" (ngSubmit)="save()">
          <header class="sheet-header">
            <h2 id="bus-sheet-title">{{ (f.id ? 'editBus' : 'addBus') | t }}</h2>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'cancel' | t" (click)="close()"><app-icon name="close" /></button>
          </header>
          <div class="sheet-body">
            <div class="field">
              <label class="label" for="fplate">{{ 'plate' | t }}</label>
              <input class="input" id="fplate" name="fplate" required [(ngModel)]="f.plate" [disabled]="!!f.id" placeholder="BN 4127">
              @if (f.id) { <span class="hint">The plate can't be changed once registered.</span> }
            </div>
            <div class="field">
              <label class="label" for="fseats">{{ 'seats' | t }}</label>
              <input class="input" id="fseats" name="fseats" type="number" min="1" max="100" required [(ngModel)]="f.seatCount">
            </div>
            <div class="field">
              <label class="label" for="ftype">{{ 'busType' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
              <input class="input" id="ftype" name="ftype" [(ngModel)]="f.type" placeholder="Coaster">
            </div>
            <div class="field">
              <label class="label" for="fowner">{{ 'owner' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
              <input class="input" id="fowner" name="fowner" [(ngModel)]="f.ownerName">
            </div>
            <div class="field">
              <label class="label" for="fownerphone">{{ 'ownerPhone' | t }} <span class="muted">({{ 'optional' | t }})</span></label>
              <div class="input-group"><span class="addon">+252</span><input class="input" id="fownerphone" name="fownerphone" type="tel" [(ngModel)]="f.ownerPhone"></div>
            </div>
            @if (error()) {
              <div class="alert alert-error" role="alert">{{ error() }}</div>
            }
          </div>
          <footer class="sheet-footer">
            <button type="button" class="btn" (click)="close()">{{ 'cancel' | t }}</button>
            <button type="submit" class="btn btn-primary" [disabled]="busy()">{{ 'save' | t }}</button>
          </footer>
        </form>
      </aside>
    }
  `,
})
export class BusesComponent {
  private readonly api = inject(ApiService);

  readonly buses = signal<Bus[]>([]);
  readonly form = signal<BusForm | null>(null);
  readonly busy = signal(false);
  readonly error = signal('');
  plate = '';

  constructor() {
    this.load();
  }

  load() {
    this.api.searchBuses(this.plate.trim()).subscribe({
      next: (list) => {
        this.buses.set(list);
        this.error.set('');
      },
      error: (e) => this.error.set(errorText(e)),
    });
  }

  openNew() {
    this.error.set('');
    this.form.set({ id: null, plate: '', seatCount: 30, type: '', ownerName: '', ownerPhone: '' });
  }

  openEdit(b: Bus) {
    this.error.set('');
    this.form.set({
      id: b.id,
      plate: b.plate,
      seatCount: b.seatCount,
      type: b.type ?? '',
      ownerName: b.ownerName ?? '',
      ownerPhone: b.ownerPhone ?? '',
    });
  }

  close() {
    this.form.set(null);
    this.error.set('');
  }

  save() {
    const f = this.form();
    if (!f) return;
    const details = {
      seatCount: Number(f.seatCount),
      type: f.type.trim() || undefined,
      ownerName: f.ownerName.trim() || undefined,
      ownerPhone: f.ownerPhone.trim() || undefined,
    };
    const call: Observable<Bus> = f.id
      ? this.api.updateBus(f.id, details)
      : this.api.createBus({ plate: f.plate.trim(), ...details });

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
}
