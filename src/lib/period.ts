import { addDays, fmtShort, MONFULL, todayISO } from './dates';
import type { Period } from './types';

export type PeriodRange = { start: string; end: string; label: string };

export function periodRange(period: Period, customStart?: string | null, customEnd?: string | null): PeriodRange {
  const t = todayISO();
  const [Y, M] = t.split('-').map(Number);

  if (period === 'month') {
    const last = new Date(Y, M, 0).getDate();
    const pad = (n: number) => (n < 10 ? `0${n}` : String(n));
    return { start: `${Y}-${pad(M)}-01`, end: `${Y}-${pad(M)}-${pad(last)}`, label: `in ${MONFULL[M - 1]} ${Y}` };
  }
  if (period === 'year') {
    return { start: `${Y}-01-01`, end: `${Y}-12-31`, label: `in ${Y}` };
  }
  if (period === 'custom') {
    let s = customStart || addDays(t, -30);
    let e = customEnd || t;
    if (s > e) [s, e] = [e, s];
    return { start: s, end: e, label: `${fmtShort(s)} – ${fmtShort(e)}` };
  }
  return { start: addDays(t, -6), end: t, label: 'in the last 7 days' };
}
