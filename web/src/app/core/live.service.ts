import { Injectable, OnDestroy, effect, inject, signal } from '@angular/core';
import { Observable, Subject, filter } from 'rxjs';
import { Socket, io } from 'socket.io-client';
import { environment } from '../../environments/environment';
import { AuthService } from './auth.service';

export interface LiveEvent {
  type: 'queue.updated' | 'passengers.updated';
  stationId: number;
  routeId?: number;
  tripId?: number;
}

/** Listens for queue and passenger changes from the API, so every screen at the boosteejo stays the same. */
@Injectable({ providedIn: 'root' })
export class LiveService implements OnDestroy {
  private readonly auth = inject(AuthService);
  private socket: Socket | null = null;
  private readonly events$ = new Subject<LiveEvent>();

  readonly connected = signal(false);

  constructor() {
    effect(() => {
      const token = this.auth.token();
      this.socket?.disconnect();
      this.socket = null;
      this.connected.set(false);
      if (token) this.connect(token);
    }, { allowSignalWrites: true });
  }

  /** Events for one route (queue screen) or any route (Today screen). */
  on(routeId?: number): Observable<LiveEvent> {
    return this.events$.pipe(filter((e) => routeId === undefined || e.routeId === routeId));
  }

  ngOnDestroy() {
    this.socket?.disconnect();
  }

  private connect(token: string) {
    const socket = io(environment.apiUrl, { auth: { token }, transports: ['websocket', 'polling'] });
    socket.on('connect', () => this.connected.set(true));
    socket.on('disconnect', () => this.connected.set(false));
    socket.on('queue.updated', (e: Omit<LiveEvent, 'type'>) => this.events$.next({ type: 'queue.updated', ...e }));
    socket.on('passengers.updated', (e: Omit<LiveEvent, 'type'>) =>
      this.events$.next({ type: 'passengers.updated', ...e }),
    );
    this.socket = socket;
  }
}
