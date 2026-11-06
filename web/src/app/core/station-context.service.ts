import { Injectable, computed, effect, inject, signal } from '@angular/core';
import { ApiService } from './api.service';
import { Station } from './api.types';
import { AuthService } from './auth.service';

const ADMIN_STATION_KEY = 'socdaal.adminStation';

/**
 * Which boosteejo the screens are showing.
 * A manager always sees their own; the admin picks one from the top bar.
 */
@Injectable({ providedIn: 'root' })
export class StationContextService {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);

  readonly stations = signal<Station[]>([]);
  private readonly adminChoice = signal<number | null>(this.readChoice());

  readonly stationId = computed<number | null>(() => {
    const user = this.auth.user();
    if (!user) return null;
    if (user.role === 'manager') return user.stationId;
    return this.adminChoice() ?? this.stations()[0]?.id ?? null;
  });

  /** The current boosteejo with its city and routes. */
  readonly station = signal<Station | null>(null);

  constructor() {
    effect(() => {
      if (this.auth.isAdmin()) this.loadStations();
    });
    effect(() => {
      const id = this.stationId();
      if (id) this.api.station(id).subscribe((s) => this.station.set(s));
      else this.station.set(null);
    }, { allowSignalWrites: true });
  }

  loadStations() {
    this.api.stations().subscribe((list) => this.stations.set(list));
  }

  /** Reload the current boosteejo, e.g. after the admin adds a route. */
  refresh() {
    const id = this.stationId();
    if (id) this.api.station(id).subscribe((s) => this.station.set(s));
  }

  choose(stationId: number) {
    this.adminChoice.set(stationId);
    try {
      localStorage.setItem(ADMIN_STATION_KEY, String(stationId));
    } catch {
      /* private mode: the choice just isn't remembered */
    }
  }

  private readChoice(): number | null {
    try {
      const v = localStorage.getItem(ADMIN_STATION_KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }
}
