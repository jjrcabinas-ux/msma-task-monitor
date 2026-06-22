import { addDays, daysBetween, fmtShort } from './dates';
import { employeeColor } from './colors';
import type { PeriodRange } from './period';
import type { EmployeeDTO, Status, TaskDTO } from './types';

export type RosterEntry = { employee: EmployeeDTO; tasks: TaskDTO[] };
export type FlatTask = TaskDTO & { empName: string; empIndex: number };

function inRange(date: string | null, range: PeriodRange): boolean {
  return !!date && date >= range.start && date <= range.end;
}

export function flattenTasks(roster: RosterEntry[]): FlatTask[] {
  const out: FlatTask[] = [];
  roster.forEach((r, idx) => {
    r.tasks.forEach((t) => out.push({ ...t, empName: r.employee.name, empIndex: idx }));
  });
  return out;
}

export function statusCounts(tasks: { status: Status }[]) {
  const counts = { Pending: 0, Ongoing: 0, Done: 0 };
  tasks.forEach((t) => {
    counts[t.status] += 1;
  });
  return counts;
}

export function buildKpis(roster: RosterEntry[], range: PeriodRange, todayIso: string) {
  const allTasks = flattenTasks(roster);
  const periodTasks = allTasks.filter((t) => inRange(t.date, range));
  const counts = statusCounts(periodTasks);
  const total = periodTasks.length;
  const done = counts.Done;
  const ongoing = counts.Ongoing;
  const pending = counts.Pending;
  const completionPct = total ? Math.round((done / total) * 100) : 0;

  const blockers = buildBlockers(roster, todayIso);

  return {
    total,
    done,
    ongoing,
    pending,
    completionPct,
    blockerCount: blockers.length,
    members: roster.length,
    periodTasks,
  };
}

export function ringGeometry(completionPct: number) {
  const C = 2 * Math.PI * 54;
  return { dasharray: C.toFixed(1), dashoffset: (C * (1 - completionPct / 100)).toFixed(1) };
}

export function buildTrend(periodTasks: FlatTask[]) {
  const dateSet = Array.from(new Set(periodTasks.filter((t) => t.date).map((t) => t.date as string))).sort();
  const doneByDate: Record<string, number> = {};
  dateSet.forEach((d) => {
    doneByDate[d] = periodTasks.filter((t) => t.date === d && t.status === 'Done').length;
  });
  const n = dateSet.length;
  const maxD = Math.max(1, ...dateSet.map((d) => doneByDate[d]));
  const X = (i: number) => (n <= 1 ? 160 : 20 + (i / (n - 1)) * 280);
  const Y = (v: number) => 88 - (v / maxD) * 64;

  const points = dateSet.map((d, i) => ({
    cx: +X(i).toFixed(1),
    cy: +Y(doneByDate[d]).toFixed(1),
    valueY: +(Y(doneByDate[d]) - 7).toFixed(1),
    label: fmtShort(d),
    value: doneByDate[d],
  }));

  let linePath = '';
  let areaPath = '';
  if (n > 0) {
    linePath = points.map((p, i) => (i ? 'L' : 'M') + p.cx + ' ' + p.cy).join(' ');
    areaPath = 'M' + points[0].cx + ' 88 ' + points.map((p) => 'L' + p.cx + ' ' + p.cy).join(' ') + ' L' + points[n - 1].cx + ' 88 Z';
  }
  return { points, linePath, areaPath, hasData: n > 0 };
}

export function buildWorkload(roster: RosterEntry[], range: PeriodRange) {
  const loadCount = (tasks: TaskDTO[]) => tasks.filter((t) => inRange(t.date, range)).length;
  const counts = roster.map((r) => ({ name: r.employee.name, id: r.employee.id, count: loadCount(r.tasks) }));
  const maxLoad = Math.max(1, ...counts.map((c) => c.count));
  return counts.map((c) => ({ ...c, pct: (c.count / maxLoad) * 100 }));
}

export function buildLeaderboard(roster: RosterEntry[], range: PeriodRange) {
  const raw = roster.map((r) => ({
    name: r.employee.name,
    id: r.employee.id,
    count: r.tasks.filter((t) => t.status === 'Done' && inRange(t.date, range)).length,
  }));
  raw.sort((a, b) => b.count - a.count);
  const maxCount = Math.max(1, ...raw.map((l) => l.count));
  return raw.map((l, i) => ({ ...l, rank: i + 1, pct: (l.count / maxCount) * 100, isTop: i === 0 }));
}

export function buildTodaySnapshot(roster: RosterEntry[], todayIso: string) {
  const rows: { task: FlatTask }[] = [];
  flattenTasks(roster)
    .filter((t) => t.date === todayIso)
    .forEach((t) => rows.push({ task: t }));
  return rows;
}

export function buildEmployeeCards(roster: RosterEntry[]) {
  return roster.map((r, idx) => {
    const t = r.tasks.length;
    const counts = statusCounts(r.tasks);
    return {
      id: r.employee.id,
      name: r.employee.name,
      initial: r.employee.name[0],
      colorIndex: idx,
      total: t,
      done: counts.Done,
      ongoing: counts.Ongoing,
      pending: counts.Pending,
      completionPct: t ? Math.round((counts.Done / t) * 100) : 0,
    };
  });
}

export function buildBlockers(roster: RosterEntry[], todayIso: string) {
  const raw = flattenTasks(roster).filter((t) => t.helpNeeded && t.helpNeeded.trim());
  raw.sort((a, b) => (a.date || '').localeCompare(b.date || ''));
  return raw.map((t) => {
    const age = t.date ? daysBetween(t.date, todayIso) : 0;
    return {
      task: t,
      dateLabel: t.date ? fmtShort(t.date) : '—',
      ageDays: age,
      daysLabel: age <= 0 ? 'today' : `${age}d open`,
      aging: age >= 3,
    };
  });
}

export function teamStackedBar(done: number, ongoing: number, pending: number, total: number) {
  const pct = (n: number) => (total ? (n / total) * 100 : 0);
  return { donePct: pct(done), ongoingPct: pct(ongoing), pendingPct: pct(pending) };
}

export function accomplishmentsForDate(tasks: TaskDTO[], date: string | null): string[] {
  if (!date) return [];
  const prev = addDays(date, -1);
  const names = tasks
    .filter((t) => t.date === prev && t.status === 'Done')
    .map((t) => t.taskGeneral)
    .filter(Boolean);
  return Array.from(new Set(names));
}

export { employeeColor, addDays };
