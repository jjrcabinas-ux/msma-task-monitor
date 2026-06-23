import { MON } from './dates';

export type BirFiling = {
  id: string;
  code: string;
  label: string;
  periodLabel: string;
  dueDate: string;
};

const MONTHLY_FORMS = [
  { code: '1601-C', label: 'Withholding Tax on Compensation' },
  { code: '1601-E', label: 'Expanded Withholding Tax' },
];

const QUARTERLY_FORMS = [
  { code: '2550Q', label: 'Quarterly VAT Return', monthsAfterQuarter: 1, dueDay: 25 },
  { code: '1701Q', label: 'Quarterly Income Tax (Individual/Professional)', monthsAfterQuarter: 2, dueDay: 15 },
];

function pad(n: number): string {
  return n < 10 ? `0${n}` : String(n);
}

function toIso(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

// General reference dates for manual (non-eFPS) filers, based on BIR's published Tax Reminder
// schedule (bir.gov.ph/tax-reminder). Actual deadlines can shift for holidays or BIR-issued
// extensions, so this is a planning aid, not a substitute for confirming with BIR/your accountant.
export function upcomingBirFilings(todayIso: string, horizonDays = 120): BirFiling[] {
  const today = new Date(`${todayIso}T00:00:00`);
  const horizonEnd = new Date(today);
  horizonEnd.setDate(horizonEnd.getDate() + horizonDays);
  const filings: BirFiling[] = [];

  for (let offset = -2; offset <= 8; offset++) {
    const covered = new Date(today.getFullYear(), today.getMonth() + offset, 1);
    // Standard deadline is the 10th of the following month, except taxes withheld in December,
    // which are due January 15 (extra time for year-end annualization).
    const isDecember = covered.getMonth() === 11;
    const due = isDecember
      ? new Date(covered.getFullYear() + 1, 0, 15)
      : new Date(covered.getFullYear(), covered.getMonth() + 1, 10);
    if (due < today || due > horizonEnd) continue;
    for (const f of MONTHLY_FORMS) {
      filings.push({
        id: `${f.code}-${covered.getFullYear()}-${pad(covered.getMonth() + 1)}`,
        code: f.code,
        label: f.label,
        periodLabel: `${MON[covered.getMonth()]} ${covered.getFullYear()}`,
        dueDate: toIso(due),
      });
    }
  }

  for (let qOffset = -1; qOffset <= 3; qOffset++) {
    const quarterStartMonth = Math.floor(today.getMonth() / 3) * 3 + qOffset * 3;
    const quarterEndDate = new Date(today.getFullYear(), quarterStartMonth + 3, 0);
    const quarterIndex = Math.floor(quarterEndDate.getMonth() / 3);
    for (const f of QUARTERLY_FORMS) {
      if (f.code === '1701Q' && quarterIndex === 3) continue;
      const due = new Date(quarterEndDate.getFullYear(), quarterEndDate.getMonth() + f.monthsAfterQuarter, f.dueDay);
      if (due < today || due > horizonEnd) continue;
      filings.push({
        id: `${f.code}-${quarterEndDate.getFullYear()}-Q${quarterIndex + 1}`,
        code: f.code,
        label: f.label,
        periodLabel: `Q${quarterIndex + 1} ${quarterEndDate.getFullYear()}`,
        dueDate: toIso(due),
      });
    }
  }

  return filings.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.code.localeCompare(b.code)));
}
