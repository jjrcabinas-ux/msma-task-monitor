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
export function birFilingsForMonth(year: number, monthIndex0: number): BirFiling[] {
  const filings: BirFiling[] = [];

  // Monthly forms are due the 10th of the month following the covered month, except taxes
  // withheld in December, which get until January 15 (extra time for year-end annualization).
  const covered = new Date(year, monthIndex0 - 1, 1);
  const dueDay = covered.getMonth() === 11 ? 15 : 10;
  const monthlyDue = new Date(year, monthIndex0, dueDay);
  for (const f of MONTHLY_FORMS) {
    filings.push({
      id: `${f.code}-${covered.getFullYear()}-${pad(covered.getMonth() + 1)}`,
      code: f.code,
      label: f.label,
      periodLabel: `${MON[covered.getMonth()]} ${covered.getFullYear()}`,
      dueDate: toIso(monthlyDue),
    });
  }

  for (const f of QUARTERLY_FORMS) {
    const quarterEnd = new Date(year, monthIndex0 - f.monthsAfterQuarter, 1);
    if (quarterEnd.getMonth() % 3 !== 2) continue; // only fires when this month is the actual due month
    const quarterIndex = Math.floor(quarterEnd.getMonth() / 3);
    if (f.code === '1701Q' && quarterIndex === 3) continue; // Q4 covered by the annual return instead
    filings.push({
      id: `${f.code}-${quarterEnd.getFullYear()}-Q${quarterIndex + 1}`,
      code: f.code,
      label: f.label,
      periodLabel: `Q${quarterIndex + 1} ${quarterEnd.getFullYear()}`,
      dueDate: toIso(new Date(year, monthIndex0, f.dueDay)),
    });
  }

  return filings.sort((a, b) => (a.dueDate < b.dueDate ? -1 : a.dueDate > b.dueDate ? 1 : a.code.localeCompare(b.code)));
}
