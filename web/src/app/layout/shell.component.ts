import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { AuthService } from '../core/auth.service';
import { I18nService, TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <header class="top">
      <div class="top-inner">
        <div class="brand">
          <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="15" rx="2"></rect><path d="M4 11h16"></path>
            <circle cx="8" cy="14.5" r="1"></circle><circle cx="16" cy="14.5" r="1"></circle><path d="M7 18v2M17 18v2"></path>
          </svg>
          <div>
            <strong>{{ 'appName' | t }}</strong>
            @if (!auth.isAdmin()) {
              <span class="sub">{{ ctx.station()?.name }} · {{ ctx.station()?.city?.name }}</span>
            }
          </div>
        </div>

        @if (auth.isAdmin()) {
          <label class="station-pick">
            <span class="sr">{{ 'chooseStation' | t }}</span>
            <select (change)="pick($event)">
              @for (s of ctx.stations(); track s.id) {
                <option [value]="s.id" [selected]="s.id === ctx.stationId()">{{ s.city?.name }} · {{ s.name }}</option>
              }
            </select>
          </label>
        }

        <div class="top-actions">
          <button type="button" class="lang" (click)="toggleLang()" aria-label="Luqadda / Language">
            {{ i18n.lang() === 'so' ? 'EN' : 'SO' }}
          </button>
          <button type="button" class="lang" (click)="auth.logout()">{{ 'signOut' | t }}</button>
        </div>
      </div>
      <nav class="nav">
        <a routerLink="/today" routerLinkActive="on">{{ 'today' | t }}</a>
        <a routerLink="/queue" routerLinkActive="on">{{ 'queue' | t }}</a>
        <a routerLink="/records" routerLinkActive="on">{{ 'records' | t }}</a>
        @if (auth.isAdmin()) {
          <a routerLink="/admin" routerLinkActive="on">{{ 'admin' | t }}</a>
        }
      </nav>
    </header>

    @if (!live.connected()) {
      <div class="offline" role="status">{{ 'notConnected' | t }}</div>
    }

    <main><router-outlet /></main>
  `,
  styles: [`
    .top { background: var(--ink); color: #fff; }
    .top-inner { max-width: 1100px; margin: 0 auto; padding: 14px 16px 8px; display: flex; flex-wrap: wrap; align-items: center; gap: 12px; }
    .brand { display: flex; align-items: center; gap: 10px; flex: 1 1 220px; }
    .brand strong { font-family: 'Space Grotesk', sans-serif; font-size: 18px; display: block; }
    .sub { font-size: 13px; color: #c9d4e3; }
    .station-pick select { min-height: 40px; border-radius: 10px; border: none; padding: 0 10px; font: inherit; max-width: 280px; }
    .top-actions { display: flex; gap: 8px; }
    .lang { min-height: 40px; padding: 0 12px; border-radius: 10px; border: 1px solid #3a4d66; background: transparent; color: #fff; font: inherit; font-weight: 600; cursor: pointer; }
    .nav { max-width: 1100px; margin: 0 auto; padding: 0 8px; display: flex; gap: 4px; overflow-x: auto; }
    .nav a { color: #c9d4e3; text-decoration: none; padding: 12px; font-weight: 600; border-bottom: 3px solid transparent; white-space: nowrap; }
    .nav a.on { color: #fff; border-bottom-color: #6ea0ec; }
    .offline { background: var(--warn-soft); color: var(--warn); text-align: center; padding: 8px 16px; font-weight: 600; font-size: 14px; }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly ctx = inject(StationContextService);
  readonly i18n = inject(I18nService);
  readonly live = inject(LiveService);

  pick(event: Event) {
    this.ctx.choose(Number((event.target as HTMLSelectElement).value));
  }

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'so' ? 'en' : 'so');
  }
}
