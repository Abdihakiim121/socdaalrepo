import { Injectable, signal } from '@angular/core';

export interface RegisterPassengerRequest {
  /** Route to start on; defaults to the last one used, then the first route. */
  routeId?: number;
  /** Bus (trip) to select; defaults to the first bus in line with seats left. */
  tripId?: number;
}

const LAST_ROUTE_KEY = 'socdaal.lastRoute';

/** Opens the Register passenger panel from any page. The shell renders it. */
@Injectable({ providedIn: 'root' })
export class RegisterPassengerService {
  readonly request = signal<RegisterPassengerRequest | null>(null);

  open(request: RegisterPassengerRequest = {}) {
    this.request.set(request);
  }

  close() {
    this.request.set(null);
  }

  get lastRouteId(): number | null {
    try {
      const v = localStorage.getItem(LAST_ROUTE_KEY);
      return v ? Number(v) : null;
    } catch {
      return null;
    }
  }

  set lastRouteId(id: number | null) {
    try {
      if (id) localStorage.setItem(LAST_ROUTE_KEY, String(id));
    } catch {
      /* not remembered in private mode */
    }
  }
}
