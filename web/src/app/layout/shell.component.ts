import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { I18nService, TranslatePipe } from '../core/i18n';
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
      <aside class="sidebar" id="sidebar" [attr.aria-label]="'menu' | t">
        <div class="brand">
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
               stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
            <rect x="4" y="3" width="16" height="15" rx="2"></rect><path d="M4 11h16"></path>
            <circle cx="8" cy="14.5" r="1"></circle><circle cx="16" cy="14.5" r="1"></circle><path d="M7 18v2M17 18v2"></path>
          </svg>
          <div>
            <strong>Socdaal</strong>
            <span>Boosteejo</span>
          </div>
        </div>

        <div class="station">
          @if (auth.isAdmin()) {
            <label for="station-pick">{{ 'chooseStation' | t }}</label>
            <select id="station-pick" (change)="pick($event)">
              @for (s of ctx.stations(); track s.id) {
                <option [value]="s.id" [selected]="s.id === ctx.stationId()">{{ s.city?.name }} · {{ s.name }}</option>
              }
            </select>
          } @else {
            <span class="station-label">{{ 'boosteejo' | t }}</span>
            <strong>{{ ctx.station()?.name }}</strong>
            <span class="station-city">{{ ctx.station()?.city?.name }}</span>
          }
        </div>

        <nav class="nav">
          <a routerLink="/today" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="17" rx="2"></rect><path d="M3 9h18M8 2v4M16 2v4"></path></svg>
            {{ 'today' | t }}
          </a>
          <a routerLink="/queue" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 6h13M8 12h13M8 18h13"></path><circle cx="4" cy="6" r="1"></circle><circle cx="4" cy="12" r="1"></circle><circle cx="4" cy="18" r="1"></circle></svg>
            {{ 'queue' | t }}
          </a>
          <a routerLink="/buses/arrival" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="4" y="3" width="16" height="15" rx="2"></rect><path d="M4 11h16M12 6v2"></path><path d="M7 18v2M17 18v2"></path></svg>
            {{ 'registerBus' | t }}
          </a>
          <a routerLink="/records" routerLinkActive="on">
            <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="7"></circle><path d="M21 21l-5-5"></path></svg>
            {{ 'records' | t }}
          </a>
          @if (auth.isAdmin()) {
            <a routerLink="/admin" routerLinkActive="on">
              <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"></path></svg>
              {{ 'admin' | t }}
            </a>
          }
        </nav>

        <div class="foot">
          <div class="who">
            <strong>{{ auth.user()?.name }}</strong>
            <span>+252 {{ auth.user()?.phone }}</span>
          </div>
          <div class="foot-actions">
            <button type="button" (click)="toggleLang()" aria-label="Luqadda / Language">
              {{ i18n.lang() === 'so' ? 'English' : 'Soomaali' }}
            </button>
            <button type="button" (click)="auth.logout()">{{ 'signOut' | t }}</button>
          </div>
        </div>
      </aside>

      <button type="button" class="scrim" tabindex="-1" aria-hidden="true" (click)="menuOpen.set(false)"></button>

      <div class="content">
        <header class="mobile-bar">
          <button type="button" class="menu-btn" aria-controls="sidebar" [attr.aria-expanded]="menuOpen()"
                  [attr.aria-label]="'menu' | t" (click)="menuOpen.set(!menuOpen())">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
                 stroke-linecap="round" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"></path></svg>
          </button>
          <strong>Socdaal Boosteejo</strong>
        </header>

        @if (!live.connected()) {
          <div class="offline" role="status">{{ 'notConnected' | t }}</div>
        }

        <main><router-outlet /></main>
      </div>
    </div>
  `,
  styles: [`
    :host { --sidebar: 248px; }
    .layout { min-height: 100vh; display: flex; }

    .sidebar {
      width: var(--sidebar); flex-shrink: 0; background: var(--ink); color: #fff;
      display: flex; flex-direction: column; gap: 20px; padding: 20px 14px;
      position: sticky; top: 0; height: 100vh; overflow-y: auto;
    }
    .brand { display: flex; align-items: center; gap: 10px; padding: 0 8px; }
    .brand strong { font-family: 'Space Grotesk', sans-serif; font-size: 20px; display: block; line-height: 1.1; }
    .brand span { font-size: 13px; color: #c9d4e3; }

    .station { display: flex; flex-direction: column; gap: 4px; background: #1b3150; border-radius: 12px; padding: 12px; }
    .station label, .station-label { font-size: 12px; color: #c9d4e3; font-weight: 600; }
    .station-city { font-size: 13px; color: #c9d4e3; }
    .station select { min-height: 40px; border-radius: 8px; border: none; padding: 0 8px; font: inherit; width: 100%; }

    .nav { display: flex; flex-direction: column; gap: 4px; flex: 1; }
    .nav a {
      display: flex; align-items: center; gap: 12px; min-height: 44px; padding: 0 12px; border-radius: 10px;
      color: #c9d4e3; text-decoration: none; font-weight: 600;
    }
    .nav a:hover { background: #1b3150; color: #fff; }
    .nav a.on { background: var(--primary); color: #fff; }
    .nav svg { width: 20px; height: 20px; flex-shrink: 0; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }

    .foot { border-top: 1px solid #2a4060; padding-top: 14px; display: flex; flex-direction: column; gap: 10px; }
    .who { display: flex; flex-direction: column; padding: 0 8px; }
    .who span { font-size: 13px; color: #c9d4e3; }
    .foot-actions { display: flex; gap: 8px; }
    .foot-actions button {
      flex: 1; min-height: 40px; border-radius: 10px; border: 1px solid #3a4d66; background: transparent;
      color: #fff; font: inherit; font-size: 14px; font-weight: 600; cursor: pointer;
    }

    .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .mobile-bar { display: none; }
    .scrim { display: none; }
    .offline { background: var(--warn-soft); color: var(--warn); text-align: center; padding: 8px 16px; font-weight: 600; font-size: 14px; }

    /* Phone: the sidebar slides in over the page */
    @media (max-width: 899px) {
      .sidebar {
        position: fixed; left: 0; top: 0; z-index: 20; transform: translateX(-100%);
        transition: transform 0.2s ease; box-shadow: 4px 0 24px rgba(16, 34, 58, 0.25);
      }
      .menu-open .sidebar { transform: none; }
      .menu-open .scrim {
        display: block; position: fixed; inset: 0; z-index: 10; border: none; background: rgba(16, 34, 58, 0.45);
      }
      .mobile-bar {
        display: flex; align-items: center; gap: 8px; background: var(--ink); color: #fff;
        padding: 8px 12px; position: sticky; top: 0; z-index: 5;
      }
      .mobile-bar strong { font-family: 'Space Grotesk', sans-serif; font-size: 17px; }
      .menu-btn {
        width: 44px; height: 44px; border: none; border-radius: 10px; background: transparent; color: #fff;
        display: flex; align-items: center; justify-content: center; cursor: pointer;
      }
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly ctx = inject(StationContextService);
  readonly i18n = inject(I18nService);
  readonly live = inject(LiveService);

  /** Only used on phones; on wider screens the sidebar is always shown. */
  readonly menuOpen = signal(false);

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

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'so' ? 'en' : 'so');
  }
}
