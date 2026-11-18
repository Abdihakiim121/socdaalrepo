import { HttpException, HttpStatus, Injectable } from '@nestjs/common';

const WINDOW_MS = 15 * 60_000;
/** Wrong PINs allowed for one phone number in the window. */
const MAX_PER_PHONE = 5;
/** Wrong PINs allowed from one network address in the window, across all phone numbers. */
const MAX_PER_IP = 30;

/**
 * Slows down PIN guessing. A 4–6 digit PIN has at most a million combinations, so without a limit
 * it can be guessed. Kept in memory: correct for one API server, which is all Stage 1 needs.
 * With several servers, move these counters to Redis.
 */
@Injectable()
export class LoginThrottleService {
  private readonly byPhone = new Map<string, number[]>();
  private readonly byIp = new Map<string, number[]>();
  private calls = 0;

  /** Throws 429 when this phone number or address has failed too often recently. */
  check(phone: string, ip: string) {
    const now = Date.now();
    const phoneFails = this.recent(this.byPhone, phone, now);
    const ipFails = this.recent(this.byIp, ip, now);
    const blocked = phoneFails.length >= MAX_PER_PHONE ? phoneFails : ipFails.length >= MAX_PER_IP ? ipFails : null;
    if (blocked) {
      const minutes = Math.max(1, Math.ceil((blocked[0] + WINDOW_MS - now) / 60_000));
      throw new HttpException(
        `Too many wrong PINs. Try again in ${minutes} minute${minutes === 1 ? '' : 's'}.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
  }

  fail(phone: string, ip: string) {
    const now = Date.now();
    this.recent(this.byPhone, phone, now).push(now);
    this.recent(this.byIp, ip, now).push(now);
    if (++this.calls % 200 === 0) this.prune(now);
  }

  succeed(phone: string) {
    this.byPhone.delete(phone);
  }

  /** Failures inside the window for this key, oldest first; older ones are dropped. */
  private recent(map: Map<string, number[]>, key: string, now: number) {
    const list = (map.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
    map.set(key, list);
    return list;
  }

  private prune(now: number) {
    for (const map of [this.byPhone, this.byIp]) {
      for (const [key, list] of map) {
        if (list.every((t) => now - t >= WINDOW_MS)) map.delete(key);
      }
    }
  }
}
