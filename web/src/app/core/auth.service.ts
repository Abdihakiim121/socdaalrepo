import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { ApiService } from './api.service';
import { User } from './api.types';

const TOKEN_KEY = 'socdaal.token';
const USER_KEY = 'socdaal.user';

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly api = inject(ApiService);
  private readonly router = inject(Router);

  readonly token = signal<string | null>(read<string>(TOKEN_KEY));
  readonly user = signal<User | null>(read<User>(USER_KEY));
  readonly isAdmin = computed(() => this.user()?.role === 'admin');
  readonly isSignedIn = computed(() => !!this.token());

  login(phone: string, pin: string) {
    return this.api.login(phone, pin).pipe(
      tap(({ token, user }) => {
        localStorage.setItem(TOKEN_KEY, JSON.stringify(token));
        localStorage.setItem(USER_KEY, JSON.stringify(user));
        this.token.set(token);
        this.user.set(user);
      }),
    );
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/login']);
  }
}
