export const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const MONFULL = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
export const WEEKFULL = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
export const WEEKSHORT = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

export function todayISO(): string {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function isoToParts(iso: string): { y: number; m: number; d: number } {
  const [y, m, d] = iso.split('-').map(Number);
  return { y, m, d };
}

export function addDays(iso: string, delta: number): string {
  const { y, m, d } = isoToParts(iso);
  const dt = new Date(y, m - 1, d);
  dt.setDate(dt.getDate() + delta);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function daysBetween(iso: string, todayIso: string): number {
  const a = isoToParts(iso);
  const t = isoToParts(todayIso);
  const ad = new Date(a.y, a.m - 1, a.d);
  const td = new Date(t.y, t.m - 1, t.d);
  return Math.round((td.getTime() - ad.getTime()) / 86400000);
}

export function fmtShort(iso: string | null | undefined): string {
  if (!iso) return '';
  const { m, d } = isoToParts(iso);
  return `${MON[m - 1]} ${d}`;
}

export function fmtLongFromIso(iso: string): string {
  const { y, m, d } = isoToParts(iso);
  const dt = new Date(y, m - 1, d);
  return `${WEEKFULL[dt.getDay()]}, ${MONFULL[m - 1]} ${d}, ${y}`;
}

export function fmtLongDate(iso: string): string {
  const { y, m, d } = isoToParts(iso);
  return `${MONFULL[m - 1]} ${d}, ${y}`;
}

export const EDIT_WINDOW_DAYS = 14;

export function isTaskLocked(dateIso: string | null | undefined, todayIso: string): boolean {
  if (!dateIso) return false;
  return daysBetween(dateIso, todayIso) >= EDIT_WINDOW_DAYS;
}

export function mondayOf(iso: string): string {
  const { y, m, d } = isoToParts(iso);
  const dt = new Date(y, m - 1, d);
  const dow = dt.getDay();
  const diffToMonday = dow === 0 ? -6 : 1 - dow;
  dt.setDate(dt.getDate() + diffToMonday);
  return `${dt.getFullYear()}-${pad(dt.getMonth() + 1)}-${pad(dt.getDate())}`;
}

export function daysInMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

export function firstWeekdayOfMonth(year: number, monthIndex0: number): number {
  return new Date(year, monthIndex0, 1).getDay();
}
