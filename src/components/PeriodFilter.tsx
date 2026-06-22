'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import styles from './PeriodFilter.module.css';
import type { Period } from '@/lib/types';

const TABS: { key: Period; label: string }[] = [
  { key: 'week', label: 'Week' },
  { key: 'month', label: 'Month' },
  { key: 'year', label: 'Year' },
  { key: 'custom', label: 'Custom' },
];

export default function PeriodFilter({
  period,
  customStart,
  customEnd,
}: {
  period: Period;
  customStart: string;
  customEnd: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();

  function setPeriod(p: Period) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', p);
    router.push(`/?${params.toString()}`);
  }

  function setCustomRange(start: string, end: string) {
    const params = new URLSearchParams(searchParams.toString());
    params.set('period', 'custom');
    params.set('start', start);
    params.set('end', end);
    router.push(`/?${params.toString()}`);
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 8 }}>
      <div className={styles.tabs}>
        {TABS.map((t) => (
          <div
            key={t.key}
            onClick={() => setPeriod(t.key)}
            className={`${styles.tab} ${period === t.key ? styles.tabActive : ''}`}
          >
            {t.label}
          </div>
        ))}
      </div>
      {period === 'custom' && (
        <div className={styles.customRow}>
          <input
            type="date"
            defaultValue={customStart}
            onChange={(e) => setCustomRange(e.target.value, customEnd)}
            className={styles.dateInput}
          />
          <span className={styles.to}>to</span>
          <input
            type="date"
            defaultValue={customEnd}
            onChange={(e) => setCustomRange(customStart, e.target.value)}
            className={styles.dateInput}
          />
        </div>
      )}
    </div>
  );
}
