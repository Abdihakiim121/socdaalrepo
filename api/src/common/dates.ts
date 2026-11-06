const MOGADISHU_OFFSET_HOURS = 3;

/** Today's date in Mogadishu as YYYY-MM-DD. */
export function mogadishuToday(): string {
  return new Date(Date.now() + MOGADISHU_OFFSET_HOURS * 3600_000).toISOString().slice(0, 10);
}

/** Start and end of a Mogadishu day, as strings MySQL compares against DATETIME columns. */
export function dayRange(date: string): { from: string; to: string } {
  const next = new Date(`${date}T00:00:00Z`);
  next.setUTCDate(next.getUTCDate() + 1);
  return { from: `${date} 00:00:00`, to: `${next.toISOString().slice(0, 10)} 00:00:00` };
}
