import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { map } from 'rxjs';
import { TextKey, TranslatePipe } from '../core/i18n';
import { IconComponent, IconName } from '../shared/icon.component';

interface Feature {
  key: TextKey;
  icon: IconName;
  summary: string;
  plans: string[];
}

const FEATURES: Feature[] = [
  {
    key: 'tours',
    icon: 'tours',
    summary: 'Day trips and multi-day tours from each city, sold to bus passengers and visitors from the diaspora.',
    plans: ['Tour listings with price, dates and seats', 'Bookings paid by mobile money', 'Bus ticket and tour in one booking'],
  },
  {
    key: 'hotels',
    icon: 'hotels',
    summary: 'Hotels and guesthouses near each boosteejo, so travellers can book a room with their bus seat.',
    plans: ['Hotel profiles with rooms and prices', 'Room bookings and confirmations by SMS', 'Commission on each booking'],
  },
  {
    key: 'guides',
    icon: 'guides',
    summary: 'Local guides who know the history and safe routes of their city.',
    plans: ['Guide profiles with languages and areas', 'Booking a guide by the day', 'Reviews from travellers'],
  },
];

/** Dalmar, the tourism product, is planned for Stage 3. This page says what is coming. */
@Component({
  selector: 'app-dalmar',
  standalone: true,
  imports: [TranslatePipe, IconComponent],
  template: `
    <div class="page narrow">
      <header class="page-header">
        <div>
          <h1>{{ current().key | t }}</h1>
          <p class="page-sub">Dalmar is the tourism side of Socdaal. It is planned for Stage 3, after the boosteejo pilot.</p>
        </div>
      </header>

      <section class="panel soon-panel">
        <div class="soon-icon"><app-icon [name]="current().icon" /></div>
        <div class="soon-text">
          <span class="soon-tag">{{ 'soon' | t }}</span>
          <p>{{ current().summary }}</p>
          <ul>
            @for (p of current().plans; track p) { <li>{{ p }}</li> }
          </ul>
        </div>
      </section>
    </div>
  `,
  styles: [`
    .soon-panel { display: flex; gap: 20px; padding: 28px; align-items: flex-start; }
    .soon-icon { width: 48px; height: 48px; border-radius: 12px; background: var(--teal-tint); color: var(--teal); display: grid; place-items: center; flex-shrink: 0; --icon-size: 24px; }
    .soon-text { display: flex; flex-direction: column; gap: 10px; max-width: 60ch; }
    .soon-tag { align-self: flex-start; font-size: 12px; font-weight: 500; color: var(--muted); border: 1px solid var(--line); background: var(--surface-2); border-radius: 999px; padding: 1px 9px; }
    ul { margin: 0; padding-left: 18px; color: var(--muted-ink); display: flex; flex-direction: column; gap: 4px; }
    @media (max-width: 560px) { .soon-panel { flex-direction: column; padding: 20px; } }
  `],
})
export class DalmarComponent {
  private readonly title = toSignal(inject(ActivatedRoute).data.pipe(map((d) => d['title'] as TextKey)));
  readonly current = computed(() => FEATURES.find((f) => f.key === this.title()) ?? FEATURES[0]);
}
