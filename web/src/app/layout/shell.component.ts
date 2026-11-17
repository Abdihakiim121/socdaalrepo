import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { I18nService, Lang, TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';

/**
 * Sidebar layout. On a laptop or tablet the menu stays on the left;
 * on a phone it opens from the menu button and closes after choosing a screen.
 */
@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe],
  template: `
    <div class="layout" [class.menu-open]="menuOpen()">
      <aside class="sidebar" id="sidebar">
        <a class="brand" routerLink="/today">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="13" rx="2.5"></rect><path d="M5 11h14M8 17v2.5M16 17v2.5"></path><circle cx="8.5" cy="14" r="0.8"></circle><circle cx="15.5" cy="14" r="0.8"></circle></svg>
          </span>
          <span class="wordmark">Socdaal <span>Boosteejo</span></span>
        </a>

        <div class="station">
          @if (auth.isAdmin()) {
            <label class="station-label" for="station-pick">{{ 'boosteejo' | t }}</label>
            <select id="station-pick" class="select" (change)="pick($event)">
              @for (s of ctx.stations(); track s.id) {
                <option [value]="s.id" [selected]="s.id === ctx.stationId()">{{ s.name }}, {{ s.city?.name }}</option>
              }
            </select>
          } @else {
            <span class="station-label">{{ 'boosteejo' | t }}</span>
            <span class="station-name">{{ ctx.station()?.name }}</span>
            <span class="station-city">{{ ctx.station()?.city?.name }}</span>
          }
        </div>

        <nav class="nav" [attr.aria-label]="'menu' | t">
          <span class="nav-group">{{ 'navStation' | t }}</span>
          <a routerLink="/today" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12h4l3-8 4 16 3-8h4"></path></svg>
            {{ 'today' | t }}
          </a>
          <a routerLink="/queue" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6h12M9 12h12M9 18h12"></path><path d="M4 6h1M4 12h1M4 18h1"></path></svg>
            {{ 'queue' | t }}
          </a>
          <a routerLink="/buses/arrival" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 5v14M5 12h14"></path></svg>
            {{ 'registerBus' | t }}
          </a>
          <a routerLink="/records" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z"></path><path d="M14 3v6h6M8 13h8M8 17h5"></path></svg>
            {{ 'records' | t }}
          </a>
          @if (auth.isAdmin()) {
            <span class="nav-group">{{ 'navSettings' | t }}</span>
            <a routerLink="/admin" routerLinkActive="on">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"></path></svg>
              {{ 'admin' | t }}
            </a>
          }
        </nav>

        <div class="foot">
          <div class="who">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="who-text">
              <span class="who-name">{{ auth.user()?.name }}</span>
              <span class="who-phone">+252 {{ auth.user()?.phone }}</span>
            </span>
            <button type="button" class="btn btn-ghost btn-icon btn-sm" [attr.aria-label]="'signOut' | t" [title]="'signOut' | t" (click)="auth.logout()">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"></path></svg>
            </button>
          </div>
          <div class="segmented lang" role="group" aria-label="Luqadda / Language">
            <button type="button" [class.on]="i18n.lang() === 'so'" (click)="setLang('so')">Soomaali</button>
            <button type="button" [class.on]="i18n.lang() === 'en'" (click)="setLang('en')">English</button>
          </div>
        </div>
      </aside>

      <button type="button" class="scrim" tabindex="-1" aria-hidden="true" (click)="menuOpen.set(false)"></button>

      <div class="content">
        <header class="mobile-bar">
          <button type="button" class="btn btn-ghost btn-icon" aria-controls="sidebar" [attr.aria-expanded]="menuOpen()"
                  [attr.aria-label]="'menu' | t" (click)="menuOpen.set(!menuOpen())">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <span class="wordmark">Socdaal <span>Boosteejo</span></span>
        </header>

        @if (!live.connected()) {
          <div class="connection" role="status">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 9v4M12 17h.01"></path><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"></path></svg>
            {{ 'notConnected' | t }}
          </div>
        }

        <main><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    .layout { min-height: 100vh; display: flex; }

    .sidebar {
      width: 252px; flex-shrink: 0; background: var(--surface); border-right: 1px solid var(--line);
      display: flex; flex-direction: column; position: sticky; top: 0; height: 100vh; overflow-y: auto;
    }
    .brand { display: flex; align-items: center; gap: 10px; padding: 20px 20px 16px; color: var(--ink); text-decoration: none; }
    .brand:hover { text-decoration: none; }
    .mark { width: 32px; height: 32px; border-radius: 8px; background: var(--teal); display: grid; place-items: center; flex-shrink: 0; }
    .mark svg { width: 22px; height: 22px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .wordmark { font-weight: 600; font-size: 16px; letter-spacing: -0.01em; color: var(--ink); }
    .wordmark span { font-weight: 400; color: var(--muted); }

    .station { margin: 0 12px 8px; padding: 12px; border: 1px solid var(--line); border-radius: var(--r); background: var(--surface-2); display: flex; flex-direction: column; gap: 2px; }
    .station-label { font-size: 12px; color: var(--muted); }
    .station-name { font-weight: 600; }
    .station-city { font-size: 13px; color: var(--muted); }
    .station .select { margin-top: 4px; min-height: 36px; }

    .nav { display: flex; flex-direction: column; gap: 2px; padding: 8px 12px; flex: 1; }
    .nav-group { font-size: 12px; color: var(--muted); padding: 16px 10px 6px; }
    .nav a {
      display: flex; align-items: center; gap: 10px; min-height: 38px; padding: 0 10px; border-radius: var(--r);
      color: var(--ink); text-decoration: none; font-weight: 500;
    }
    .nav a:hover { background: var(--canvas); }
    .nav a.on { background: var(--teal-tint); color: var(--teal-hover); font-weight: 600; }
    .nav svg { width: 18px; height: 18px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; color: var(--muted); }
    .nav a.on svg { color: var(--teal); }

    .foot { border-top: 1px solid var(--line); padding: 12px; display: flex; flex-direction: column; gap: 10px; }
    .who { display: flex; align-items: center; gap: 10px; }
    .avatar { width: 32px; height: 32px; border-radius: 50%; background: var(--teal-tint); color: var(--teal-hover); display: grid; place-items: center; font-weight: 600; font-size: 13px; flex-shrink: 0; }
    .who-text { display: flex; flex-direction: column; min-width: 0; flex: 1; }
    .who-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .who-phone { font-size: 12px; color: var(--muted); }
    .lang { display: flex; }
    .lang button { flex: 1; min-height: 30px; font-size: 13px; }

    .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .mobile-bar { display: none; }
    .scrim { display: none; }
    .connection { display: flex; align-items: center; justify-content: center; gap: 8px; background: var(--amber-tint); color: var(--amber); padding: 8px 16px; font-weight: 500; border-bottom: 1px solid #f5d9b5; }
    .connection svg, .mobile-bar svg { width: 18px; height: 18px; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    @media (max-width: 899px) {
      .sidebar { position: fixed; left: 0; top: 0; z-index: 20; transform: translateX(-100%); transition: transform 0.2s ease; }
      .menu-open .sidebar { transform: none; box-shadow: 8px 0 32px rgba(23, 32, 43, 0.18); }
      .menu-open .scrim { display: block; position: fixed; inset: 0; z-index: 10; border: none; background: rgba(23, 32, 43, 0.4); }
      .mobile-bar { display: flex; align-items: center; gap: 6px; padding: 8px 12px; background: var(--surface); border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5; }
    }
    @media (prefers-reduced-motion: reduce) { .sidebar { transition: none; } }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly ctx = inject(StationContextService);
  readonly i18n = inject(I18nService);
  readonly live = inject(LiveService);

  /** Only used on phones; on wider screens the sidebar is always shown. */
  readonly menuOpen = signal(false);

  readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  constructor() {
    inject(Router)
      .events.pipe(
        filter((e) => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe(() => this.menuOpen.set(false));
  }

  pick(event: Event) {
    this.ctx.choose(Number((event.target as HTMLSelectElement).value));
    this.menuOpen.set(false);
  }

  setLang(lang: Lang) {
    this.i18n.setLang(lang);
  }
}
