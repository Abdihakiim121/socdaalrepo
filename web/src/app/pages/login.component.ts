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
    <div class="wrap">
      <form class="card stack" (ngSubmit)="submit()">
        <div class="row spread">
          <h1>{{ 'appName' | t }}</h1>
          <button type="button" class="pill" (click)="toggleLang()">{{ i18n.lang() === 'so' ? 'English' : 'Soomaali' }}</button>
        </div>
        <div class="field">
          <label for="phone">{{ 'phone' | t }}</label>
          <input id="phone" name="phone" type="tel" autocomplete="username" required [(ngModel)]="phone" placeholder="61 234 5678">
        </div>
        <div class="field">
          <label for="pin">{{ 'pin' | t }}</label>
          <input id="pin" name="pin" type="password" inputmode="numeric" autocomplete="current-password"
                 required minlength="4" maxlength="6" [(ngModel)]="pin">
        </div>
        @if (error()) {
          <div class="alert alert-error" role="alert">{{ error() }}</div>
        }
        <button class="btn btn-primary" type="submit" [disabled]="busy()">{{ 'signIn' | t }}</button>
      </form>
    </div>
  `,
  styles: [`
    .wrap { min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 16px; }
    form { width: 100%; max-width: 380px; padding: 24px; }
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

  toggleLang() {
    this.i18n.setLang(this.i18n.lang() === 'so' ? 'en' : 'so');
  }
}
