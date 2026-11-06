// The boosteejos run on Mogadishu time (UTC+3), whatever the device clock's zone.
export const MOGADISHU_TZ = '+0300';

/** Today's date in Mogadishu, YYYY-MM-DD. */
export function mogadishuToday(): string {
  return new Date(Date.now() + 3 * 3600_000).toISOString().slice(0, 10);
}

/** "06:30" from an input type=time → an ISO time today in Mogadishu, for the API. */
export function timeToIso(hhmm: string, date = mogadishuToday()): string {
  return `${date}T${hhmm}:00+03:00`;
}

/** An API date-time → "06:30" in Mogadishu, for an input type=time. */
export function isoToTime(iso: string | null): string {
  if (!iso) return '';
  return new Date(new Date(iso).getTime() + 3 * 3600_000).toISOString().slice(11, 16);
}
