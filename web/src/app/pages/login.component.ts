import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { errorText } from '../core/api.service';
import { AuthService } from '../core/auth.service';
import { I18nService, TranslatePipe } from '../core/i18n';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  template: `
    <div class="login">
      <div class="login-box">
        <div class="login-brand">
          <span class="mark" aria-hidden="true">
            <svg viewBox="0 0 24 24"><rect x="5" y="4" width="14" height="13" rx="2.5"></rect><path d="M5 11h14M8 17v2.5M16 17v2.5"></path><circle cx="8.5" cy="14" r="0.8"></circle><circle cx="15.5" cy="14" r="0.8"></circle></svg>
          </span>
          <span class="wordmark">Socdaal <span>Boosteejo</span></span>
        </div>

        <form class="panel login-form" (ngSubmit)="submit()">
          <div>
            <h1>{{ 'signIn' | t }}</h1>
            <p class="page-sub">{{ 'signInSub' | t }}</p>
          </div>
          <div class="field">
            <label class="label" for="phone">{{ 'phone' | t }}</label>
            <div class="input-group">
              <span class="addon">+252</span>
              <input class="input" id="phone" name="phone" type="tel" autocomplete="username" required [(ngModel)]="phone" placeholder="61 234 5678">
            </div>
          </div>
          <div class="field">
            <label class="label" for="pin">{{ 'pin' | t }}</label>
            <input class="input" id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password"
                   required minlength="4" maxlength="6" [(ngModel)]="pin">
          </div>
          @if (error()) {
            <div class="alert alert-error" role="alert">{{ error() }}</div>
          }
          <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ 'signIn' | t }}</button>
        </form>

        <div class="segmented login-lang" role="group" aria-label="Luqadda / Language">
          <button type="button" [class.on]="i18n.lang() === 'so'" (click)="i18n.setLang('so')">Soomaali</button>
          <button type="button" [class.on]="i18n.lang() === 'en'" (click)="i18n.setLang('en')">English</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login { min-height: 100vh; display: grid; place-items: center; padding: 24px 16px; }
    .login-box { width: 100%; max-width: 400px; display: flex; flex-direction: column; gap: 20px; }
    .login-brand { display: flex; align-items: center; gap: 10px; justify-content: center; }
    .mark { width: 36px; height: 36px; border-radius: 9px; background: var(--teal); display: grid; place-items: center; }
    .mark svg { width: 24px; height: 24px; fill: none; stroke: #fff; stroke-width: 1.8; stroke-linecap: round; stroke-linejoin: round; }
    .wordmark { font-weight: 600; font-size: 18px; }
    .wordmark span { font-weight: 400; color: var(--muted); }
    .login-form { padding: 28px; display: flex; flex-direction: column; gap: 18px; }
    .login-form .btn { width: 100%; min-height: 44px; }
    .login-lang { align-self: center; }
  `],
})
export class LoginComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  readonly i18n = inject(I18nService);

  phone = '';
  pin = '';
  readonly busy = signal(false);
  readonly error = signal('');

  submit() {
    this.busy.set(true);
    this.error.set('');
    this.auth.login(this.phone, this.pin).subscribe({
      next: () => this.router.navigate(['/today']),
      error: (e) => {
        this.error.set(errorText(e));
        this.busy.set(false);
      },
    });
  }

}
