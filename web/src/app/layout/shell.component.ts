import { NgTemplateOutlet } from '@angular/common';
import { Component, DestroyRef, HostListener, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRouteSnapshot, NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../core/auth.service';
import { I18nService, Lang, TextKey, TranslatePipe } from '../core/i18n';
import { LiveService } from '../core/live.service';
import { StationContextService } from '../core/station-context.service';
import { IconComponent, IconName } from '../shared/icon.component';
import { RegisterPassengerComponent } from '../shared/register-passenger.component';
import { RegisterPassengerService } from '../shared/register-passenger.service';

interface NavLink {
  label: TextKey;
  link: string;
}

interface NavGroup {
  id: 'boosteejo' | 'dalmar' | 'settings';
  label: TextKey;
  icon: IconName;
  base: string;
  items: NavLink[];
  soon?: boolean;
  adminOnly?: boolean;
}

/** What a route puts in its `data`, read for the breadcrumb. */
export interface PageData {
  section?: TextKey;
  parent?: { label: TextKey; link: string };
  title?: TextKey;
}

interface Crumb {
  label: TextKey;
  link?: string;
}

const OPEN_KEY = 'socdaal.nav.open';

@Component({
  selector: 'app-shell',
  standalone: true,
  imports: [NgTemplateOutlet, RouterOutlet, RouterLink, RouterLinkActive, TranslatePipe, IconComponent, RegisterPassengerComponent],
  template: `
    <div class="layout" [class.menu-open]="menuOpen()">
      <aside class="sidebar" id="sidebar">
        <!-- Boosteejo switcher -->
        <div class="switcher-wrap" (click)="$event.stopPropagation()">
          @if (auth.isAdmin()) {
            <button type="button" class="switcher" [attr.aria-expanded]="stationMenu()" aria-haspopup="listbox"
                    [title]="'switchBoosteejo' | t" (click)="toggle('station')">
              <span class="monogram" aria-hidden="true">{{ monogram() }}</span>
              <span class="switcher-text">
                <span class="switcher-name">{{ ctx.station()?.name ?? '—' }}</span>
                <span class="switcher-city">{{ ctx.station()?.city?.name }}</span>
              </span>
              <app-icon name="chevronsUpDown" class="switcher-chev" />
            </button>
            @if (stationMenu()) {
              <div class="popover station-pop" role="listbox" [attr.aria-label]="'switchBoosteejo' | t">
                <span class="pop-label">{{ 'switchBoosteejo' | t }}</span>
                @for (s of ctx.stations(); track s.id) {
                  <button type="button" role="option" class="pop-item" [attr.aria-selected]="s.id === ctx.stationId()" (click)="pick(s.id)">
                    <span class="monogram sm" aria-hidden="true">{{ s.name.charAt(0).toUpperCase() }}</span>
                    <span class="pop-text"><span>{{ s.name }}</span><span class="muted">{{ s.city?.name }}</span></span>
                    @if (s.id === ctx.stationId()) { <app-icon name="check" class="pop-check" /> }
                  </button>
                }
              </div>
            }
          } @else {
            <div class="switcher static">
              <span class="monogram" aria-hidden="true">{{ monogram() }}</span>
              <span class="switcher-text">
                <span class="switcher-name">{{ ctx.station()?.name ?? '—' }}</span>
                <span class="switcher-city">{{ ctx.station()?.city?.name }}</span>
              </span>
            </div>
          }
        </div>

        <nav class="nav" [attr.aria-label]="'menu' | t">
          <a class="item" routerLink="/dashboard" routerLinkActive="on">
            <app-icon name="dashboard" />
            <span>{{ 'dashboard' | t }}</span>
          </a>

          @for (g of moduleGroups; track g.id) {
            <ng-container *ngTemplateOutlet="group; context: { $implicit: g }" />
          }

          @if (auth.isAdmin()) {
            <span class="section-label">{{ 'administration' | t }}</span>
            <a class="item" routerLink="/users" routerLinkActive="on">
              <app-icon name="users" />
              <span>{{ 'userManagement' | t }}</span>
            </a>
            <ng-container *ngTemplateOutlet="group; context: { $implicit: settingsGroup }" />
          }
        </nav>

        <ng-template #group let-g>
          <div class="group" [class.open]="isOpen(g.id)">
            <button type="button" class="item group-head" [class.has-active]="inGroup(g)"
                    [attr.aria-expanded]="isOpen(g.id)" [attr.aria-controls]="'grp-' + g.id" (click)="toggleGroup(g.id)">
              <app-icon [name]="g.icon" />
              <span>{{ g.label | t }}</span>
              @if (g.soon) { <span class="soon">{{ 'soon' | t }}</span> }
              <app-icon name="chevronRight" class="chev" />
            </button>
            @if (isOpen(g.id)) {
              <div class="sub" [id]="'grp-' + g.id">
                @for (l of g.items; track l.link) {
                  <a class="sub-item" [routerLink]="l.link" routerLinkActive="on">{{ l.label | t }}</a>
                }
              </div>
            }
          </div>
        </ng-template>

        <!-- Signed-in user -->
        <div class="account" (click)="$event.stopPropagation()">
          @if (userMenu()) {
            <div class="popover user-pop" role="menu">
              <div class="pop-section">
                <span class="pop-label"><app-icon name="globe" /> {{ 'language' | t }}</span>
                <div class="segmented full">
                  <button type="button" [class.on]="i18n.lang() === 'so'" (click)="setLang('so')">Soomaali</button>
                  <button type="button" [class.on]="i18n.lang() === 'en'" (click)="setLang('en')">English</button>
                </div>
              </div>
              <button type="button" class="pop-item danger" role="menuitem" (click)="auth.logout()">
                <app-icon name="logout" /> {{ 'signOut' | t }}
              </button>
            </div>
          }
          <button type="button" class="user" aria-haspopup="menu" [attr.aria-expanded]="userMenu()" (click)="toggle('user')">
            <span class="avatar" aria-hidden="true">{{ initials() }}</span>
            <span class="user-text">
              <span class="user-name">{{ auth.user()?.name }}</span>
              <span class="user-role">{{ (auth.isAdmin() ? 'roleAdmin' : 'roleManager') | t }}</span>
            </span>
            <app-icon name="chevronsUpDown" class="user-chev" />
          </button>
        </div>
      </aside>

      <button type="button" class="scrim" tabindex="-1" aria-hidden="true" (click)="menuOpen.set(false)"></button>

      <div class="content">
        <header class="topbar">
          <button type="button" class="icon-btn menu-btn" aria-controls="sidebar" [attr.aria-expanded]="menuOpen()"
                  [attr.aria-label]="'menu' | t" (click)="menuOpen.set(!menuOpen()); $event.stopPropagation()">
            <app-icon name="menu" />
          </button>
          <nav class="crumbs" aria-label="Breadcrumb">
            @for (c of crumbs(); track $index; let last = $last) {
              @if (c.link && !last) {
                <a [routerLink]="c.link">{{ c.label | t }}</a>
              } @else {
                <span [class.current]="last" [attr.aria-current]="last ? 'page' : null">{{ c.label | t }}</span>
              }
              @if (!last) { <app-icon name="chevronRight" class="crumb-sep" /> }
            }
          </nav>
          <button type="button" class="btn btn-primary btn-sm topbar-action" (click)="passengerPanel.open(); $event.stopPropagation()">
            <app-icon name="userPlus" /><span class="topbar-action-label">{{ 'addPassenger' | t }}</span>
          </button>
          <span class="conn" [class.off]="!live.connected()" role="status"
                [title]="live.connected() ? '' : ('notConnected' | t)">
            <span class="dot" aria-hidden="true"></span>{{ (live.connected() ? 'live' : 'offline') | t }}
          </span>
        </header>

        <main><router-outlet /></main>
      </div>
    </div>

    @if (passengerPanel.request()) {
      <app-register-passenger />
    }
  `,
  styles: [`
    .layout { min-height: 100vh; display: flex; }

    /* ---------- Sidebar ---------- */
    .sidebar {
      width: 264px; flex-shrink: 0; height: 100vh; position: sticky; top: 0;
      display: flex; flex-direction: column; background: var(--side-bg); border-right: 1px solid var(--line);
    }

    .switcher-wrap { position: relative; padding: 12px 12px 8px; }
    .switcher {
      width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px;
      border: 1px solid transparent; background: transparent; font: inherit; color: var(--ink); text-align: left; cursor: pointer;
    }
    .switcher:hover { background: var(--side-hover); }
    .switcher[aria-expanded='true'] { background: var(--surface); border-color: var(--line); box-shadow: var(--shadow); }
    .switcher.static { cursor: default; }
    .switcher.static:hover { background: transparent; }
    .monogram {
      width: 32px; height: 32px; border-radius: 8px; flex-shrink: 0; display: grid; place-items: center;
      background: var(--teal); color: #fff; font-weight: 600; font-size: 14px;
    }
    .monogram.sm { width: 24px; height: 24px; border-radius: 6px; font-size: 12px; background: var(--teal-tint); color: var(--teal-hover); }
    .switcher-text { display: flex; flex-direction: column; min-width: 0; flex: 1; line-height: 1.3; }
    .switcher-name { font-weight: 600; font-size: 13.5px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .switcher-city { font-size: 12px; color: var(--muted); }
    .switcher-chev { color: var(--icon); --icon-size: 16px; }

    .nav { flex: 1; overflow-y: auto; padding: 4px 12px 12px; display: flex; flex-direction: column; gap: 1px; }
    .item {
      display: flex; align-items: center; gap: 10px; width: 100%; min-height: 34px; padding: 0 10px; border-radius: 8px;
      border: none; background: transparent; font: inherit; font-size: 13.5px; font-weight: 500; color: var(--side-ink);
      text-decoration: none; cursor: pointer; text-align: left;
    }
    .item app-icon { color: var(--icon); }
    .item:hover { background: var(--side-hover); text-decoration: none; }
    .item.on { background: var(--side-active); color: var(--teal-hover); }
    .item.on app-icon { color: var(--teal); }
    .item span { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

    .group-head .chev { --icon-size: 14px; transition: transform 0.15s ease; }
    .group.open .group-head .chev { transform: rotate(90deg); }
    .group:not(.open) .group-head.has-active { color: var(--teal-hover); }
    .group:not(.open) .group-head.has-active app-icon { color: var(--teal); }
    .soon {
      flex: none !important; font-size: 11px; font-weight: 500; color: var(--muted); background: var(--side-hover);
      border: 1px solid var(--line); border-radius: 999px; padding: 0 7px; line-height: 18px;
    }

    .sub { position: relative; display: flex; flex-direction: column; gap: 1px; padding: 2px 0 6px 29px; }
    .sub::before { content: ''; position: absolute; left: 19px; top: 2px; bottom: 8px; width: 1px; background: var(--line); }
    .sub-item {
      position: relative; display: flex; align-items: center; min-height: 32px; padding: 0 10px; border-radius: 8px;
      font-size: 13.5px; color: var(--muted-ink); text-decoration: none;
    }
    .sub-item:hover { background: var(--side-hover); color: var(--ink); text-decoration: none; }
    .sub-item.on { background: var(--side-active); color: var(--teal-hover); font-weight: 500; }
    .sub-item.on::before { content: ''; position: absolute; left: -10px; top: 8px; bottom: 8px; width: 1px; background: var(--teal); }

    .section-label { font-size: 12px; color: var(--muted); padding: 18px 10px 6px; }

    /* Account */
    .account { position: relative; padding: 8px 12px 12px; border-top: 1px solid var(--line); }
    .user {
      width: 100%; display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 10px;
      border: none; background: transparent; font: inherit; color: var(--ink); cursor: pointer; text-align: left;
    }
    .user:hover, .user[aria-expanded='true'] { background: var(--side-hover); }
    .avatar { width: 30px; height: 30px; border-radius: 50%; background: #dfe9ea; color: var(--teal-hover); display: grid; place-items: center; font-size: 12px; font-weight: 600; flex-shrink: 0; }
    .user-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
    .user-name { font-size: 13.5px; font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .user-role { font-size: 12px; color: var(--muted); }
    .user-chev { color: var(--icon); --icon-size: 16px; }

    /* Popovers */
    .popover {
      position: absolute; left: 12px; right: 12px; z-index: 30; background: var(--surface); border: 1px solid var(--line);
      border-radius: 10px; box-shadow: 0 12px 32px rgba(23, 32, 43, 0.14), 0 2px 6px rgba(23, 32, 43, 0.06);
      padding: 6px; display: flex; flex-direction: column; gap: 2px;
    }
    .station-pop { top: calc(100% - 2px); max-height: 320px; overflow-y: auto; }
    .user-pop { bottom: calc(100% - 2px); }
    .pop-label { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--muted); padding: 6px 8px 4px; --icon-size: 14px; }
    .pop-section { padding-bottom: 6px; margin-bottom: 4px; border-bottom: 1px solid var(--line); }
    .pop-section .segmented { margin: 2px 6px 4px; }
    .pop-item {
      display: flex; align-items: center; gap: 10px; min-height: 36px; padding: 0 8px; border: none; border-radius: 7px;
      background: transparent; font: inherit; font-size: 13.5px; color: var(--ink); cursor: pointer; text-align: left; width: 100%;
    }
    .pop-item:hover { background: var(--side-hover); }
    .pop-item.danger { color: var(--red); }
    .pop-text { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
    .pop-text .muted { font-size: 12px; }
    .pop-check { color: var(--teal); --icon-size: 16px; }
    .segmented.full { display: flex; }
    .segmented.full button { flex: 1; min-height: 30px; font-size: 13px; }

    /* ---------- Top bar ---------- */
    .content { flex: 1; min-width: 0; display: flex; flex-direction: column; }
    .topbar {
      height: 56px; display: flex; align-items: center; gap: 8px; padding: 0 32px; background: var(--surface);
      border-bottom: 1px solid var(--line); position: sticky; top: 0; z-index: 5;
    }
    .crumbs { flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; font-size: 13.5px; color: var(--muted); }
    .crumbs a { color: var(--muted); }
    .crumbs a:hover { color: var(--ink); }
    .crumbs .current { color: var(--ink); font-weight: 500; }
    .crumb-sep { --icon-size: 14px; color: var(--icon); }
    .topbar-action { margin-right: 4px; }
    @media (max-width: 560px) { .topbar-action-label { display: none; } .topbar-action { width: 36px; padding: 0; } }
    .conn { display: inline-flex; align-items: center; gap: 6px; font-size: 12.5px; font-weight: 500; color: var(--green); padding: 3px 10px; border-radius: 999px; background: var(--green-tint); }
    .conn .dot { width: 6px; height: 6px; border-radius: 50%; background: currentColor; }
    .conn.off { color: var(--amber); background: var(--amber-tint); }
    .icon-btn { width: 36px; height: 36px; border: none; border-radius: 8px; background: transparent; color: var(--ink); display: none; place-items: center; cursor: pointer; }
    .icon-btn:hover { background: var(--canvas); }
    .scrim { display: none; }

    @media (max-width: 899px) {
      .sidebar { position: fixed; left: 0; top: 0; z-index: 40; transform: translateX(-100%); transition: transform 0.2s ease; }
      .menu-open .sidebar { transform: none; box-shadow: 12px 0 40px rgba(23, 32, 43, 0.18); }
      .menu-open .scrim { display: block; position: fixed; inset: 0; z-index: 35; border: none; background: rgba(23, 32, 43, 0.35); }
      .topbar { padding: 0 12px; }
      .icon-btn { display: grid; }
    }
    @media (prefers-reduced-motion: reduce) {
      .sidebar, .group-head .chev { transition: none; }
    }
  `],
})
export class ShellComponent {
  readonly auth = inject(AuthService);
  readonly ctx = inject(StationContextService);
  readonly i18n = inject(I18nService);
  readonly live = inject(LiveService);
  readonly passengerPanel = inject(RegisterPassengerService);
  private readonly router = inject(Router);

  readonly moduleGroups: NavGroup[] = [
    {
      id: 'boosteejo',
      label: 'boosteejo',
      icon: 'bus',
      base: '/boosteejo',
      items: [
        { label: 'queue', link: '/boosteejo/queue' },
        { label: 'registerArrival', link: '/boosteejo/arrival' },
        { label: 'trips', link: '/boosteejo/trips' },
        { label: 'passengers', link: '/boosteejo/passengers' },
        { label: 'buses', link: '/boosteejo/buses' },
      ],
    },
    {
      id: 'dalmar',
      label: 'dalmar',
      icon: 'compass',
      base: '/dalmar',
      soon: true,
      items: [
        { label: 'tours', link: '/dalmar/tours' },
        { label: 'hotels', link: '/dalmar/hotels' },
        { label: 'guides', link: '/dalmar/guides' },
      ],
    },
  ];

  readonly settingsGroup: NavGroup = {
    id: 'settings',
    label: 'settings',
    icon: 'settings',
    base: '/settings',
    adminOnly: true,
    items: [
      { label: 'boosteejos', link: '/settings/boosteejos' },
      { label: 'routes', link: '/settings/routes' },
      { label: 'cities', link: '/settings/cities' },
    ],
  };

  /** Phone only: the sidebar slides in over the page. */
  readonly menuOpen = signal(false);
  readonly stationMenu = signal(false);
  readonly userMenu = signal(false);
  private readonly open = signal<Record<string, boolean>>(this.readOpen());
  private readonly url = signal(this.router.url);
  readonly crumbs = signal<Crumb[]>([]);

  readonly monogram = computed(() => (this.ctx.station()?.name ?? '?').charAt(0).toUpperCase());
  readonly initials = computed(() =>
    (this.auth.user()?.name ?? '')
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((w) => w[0].toUpperCase())
      .join(''),
  );

  constructor() {
    this.router.events
      .pipe(
        filter((e): e is NavigationEnd => e instanceof NavigationEnd),
        takeUntilDestroyed(inject(DestroyRef)),
      )
      .subscribe((e) => {
        this.url.set(e.urlAfterRedirects);
        this.crumbs.set(this.buildCrumbs(this.router.routerState.snapshot.root));
        this.menuOpen.set(false);
        this.closePopovers();
        // Open the group of the page you are on.
        const active = [...this.moduleGroups, this.settingsGroup].find((g) => e.urlAfterRedirects.startsWith(g.base));
        if (active && !this.isOpen(active.id)) this.toggleGroup(active.id);
      });
  }

  @HostListener('document:click')
  @HostListener('document:keydown.escape')
  closePopovers() {
    this.stationMenu.set(false);
    this.userMenu.set(false);
  }

  toggle(which: 'station' | 'user') {
    const target = which === 'station' ? this.stationMenu : this.userMenu;
    const next = !target();
    this.closePopovers();
    target.set(next);
  }

  isOpen(id: string) {
    return this.open()[id] ?? id !== 'dalmar';
  }

  inGroup(g: NavGroup) {
    return this.url().startsWith(g.base);
  }

  toggleGroup(id: string) {
    this.open.update((o) => ({ ...o, [id]: !this.isOpen(id) }));
    try {
      localStorage.setItem(OPEN_KEY, JSON.stringify(this.open()));
    } catch {
      /* not remembered in private mode */
    }
  }

  pick(stationId: number) {
    this.ctx.choose(stationId);
    this.closePopovers();
    this.menuOpen.set(false);
  }

  setLang(lang: Lang) {
    this.i18n.setLang(lang);
  }

  private buildCrumbs(root: ActivatedRouteSnapshot): Crumb[] {
    let node = root;
    let data: PageData = {};
    while (node.firstChild) {
      node = node.firstChild;
      data = { ...data, ...(node.data as PageData) };
    }
    const crumbs: Crumb[] = [];
    if (data.section) crumbs.push({ label: data.section });
    if (data.parent) crumbs.push({ label: data.parent.label, link: data.parent.link });
    if (data.title) crumbs.push({ label: data.title });
    return crumbs;
  }

  private readOpen(): Record<string, boolean> {
    try {
      return JSON.parse(localStorage.getItem(OPEN_KEY) ?? '{}');
    } catch {
      return {};
    }
  }
}
