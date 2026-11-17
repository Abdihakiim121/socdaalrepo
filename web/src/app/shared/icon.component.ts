import { Component, computed, inject, input } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

// One line-icon set for the whole app: 24px grid, 1.75 stroke, round joins.
const PATHS = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
  bus: '<rect x="4" y="3" width="16" height="15" rx="3"/><path d="M4 11h16M8 18v2.5M16 18v2.5"/><path d="M8 14.5h.01M16 14.5h.01"/>',
  queue: '<path d="M10 6h10M10 12h10M10 18h10"/><path d="M4 5h2v2H4zM4 11h2v2H4zM4 17h2v2H4z"/>',
  arrival: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>',
  trips: '<circle cx="6" cy="19" r="2"/><circle cx="18" cy="5" r="2"/><path d="M8 19h8.5a3.5 3.5 0 0 0 0-7h-9a3.5 3.5 0 0 1 0-7H16"/>',
  passengers: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.5a3.5 3.5 0 0 1 0 7M18 14.5a6.5 6.5 0 0 1 3.5 5.5"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m15.5 8.5-2 5-5 2 2-5z"/>',
  tours: '<path d="M9 4 3 6.5v13.5L9 17.5l6 2.5 6-2.5V4l-6 2.5z"/><path d="M9 4v13.5M15 6.5V20"/>',
  hotels: '<path d="M3 19V6M3 15h18v4M21 15v-3a3 3 0 0 0-3-3h-7v6"/><circle cx="7" cy="11" r="2"/>',
  guides: '<path d="M5 21V4M5 4h11l-2 4 2 4H5"/>',
  users: '<circle cx="10" cy="8" r="3.5"/><path d="M3.5 20a6.5 6.5 0 0 1 10.5-5.1"/><circle cx="18" cy="17" r="2.5"/><path d="M18 13v1.5M18 19.5V21M21.5 17H20M16 17h-1.5"/>',
  settings: '<path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/>',
  pin: '<path d="M12 21s-7-6.2-7-11.5a7 7 0 0 1 14 0C19 14.8 12 21 12 21z"/><circle cx="12" cy="9.5" r="2.5"/>',
  signpost: '<path d="M12 3v18M7 21h10"/><path d="M5 6h12l2.5 2.5L17 11H5zM19 13H8l-2.5 2.5L8 18h11z"/>',
  city: '<path d="M3 21h18M5 21V8l6-4v17M11 21V10h8v11"/><path d="M8 10v.01M8 14v.01M8 18v.01M14.5 14h1M14.5 17.5h1"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  chevronRight: '<path d="m9 6 6 6-6 6"/>',
  chevronsUpDown: '<path d="m8 9 4-4 4 4M8 15l4 4 4-4"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  globe: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  minus: '<path d="M5 12h14"/>',
  userPlus: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M19 8v6M16 11h6"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  check: '<path d="m5 12 5 5 9-10"/>',
  edit: '<path d="M4 20h4L19 9l-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>',
  close: '<path d="M6 6l12 12M18 6 6 18"/>',
  up: '<path d="m6 15 6-6 6 6"/>',
  down: '<path d="m6 9 6 6 6-6"/>',
  alert: '<path d="M12 9v4M12 17h.01"/><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/>',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  standalone: true,
  template: `<span class="icon" [innerHTML]="svg()"></span>`,
  styles: [`
    :host { display: inline-flex; flex-shrink: 0; width: var(--icon-size, 18px); height: var(--icon-size, 18px); }
    .icon { display: contents; }
  `],
  host: { 'aria-hidden': 'true' },
})
export class IconComponent {
  private readonly sanitizer = inject(DomSanitizer);
  readonly name = input.required<IconName>();

  // The paths are constants above, never user input, so bypassing the sanitizer is safe.
  readonly svg = computed(() =>
    this.sanitizer.bypassSecurityTrustHtml(
      `<svg viewBox="0 0 24 24" width="100%" height="100%" fill="none" stroke="currentColor" ` +
        `stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round">${PATHS[this.name()]}</svg>`,
    ),
  );
}
