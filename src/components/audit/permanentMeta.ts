import type { AuditIndexData } from './AuditPageClient';

type Section = AuditIndexData['sections'][number];

export const CLUSTER_PARTNERS: Record<string, string> = {
  ads: 'Atty. Antonio Sanchez Jr., CPA',
  rpm: 'Atty. Rhenier Mora, CPA',
  vcm: 'Victorio Meñoza, CPA',
};

export const PERM_FIELDS: { key: string; label: string }[] = [
  { key: 'CLIENT_REF', label: 'CLIENT / REFERENCE:' },
  { key: 'ACCT_DATE', label: 'ACCOUNTING REFERENCE DATE:' },
  { key: 'PARTNER', label: 'PARTNER:' },
  { key: 'SR_ASSOCIATE', label: 'SENIOR ASSOCIATE IN-CHARGE:' },
  { key: 'JR_ASSOCIATE', label: 'JUNIOR ASSOCIATE IN-CHARGE:' },
];

/* Fixed Section A list shown on the Permanent tab */
export const PERM_SECTION_LIST: { ref: string; description: string }[] = [
  { ref: 'A1', description: 'General matters' },
  { ref: 'A2', description: 'Documents and correspondence of a permanent nature' },
  { ref: 'A3', description: 'Statutory matters' },
];

/* Value for a Permanent meta field with the same fallbacks the tab displays */
export function permMetaValue(
  section: Section,
  key: string,
  ctx: { clientName: string; cluster: string; year: number },
): string {
  const stored = section.items.find((it) => it.refNum === key)?.description || '';
  if (stored) return stored;
  if (key === 'CLIENT_REF') return ctx.clientName;
  if (key === 'PARTNER') return CLUSTER_PARTNERS[ctx.cluster] ?? '';
  if (key === 'ACCT_DATE') return `December 31, ${ctx.year}`;
  return '';
}
