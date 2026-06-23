'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState, useTransition } from 'react';
import { addTaskAction } from '@/lib/actions';
import type { BirFiling } from '@/lib/birCalendar';
import type { ClusterSlug } from '@/lib/clusters';
import { fmtShort } from '@/lib/dates';
import styles from '@/app/[cluster]/summary.module.css';

export default function TaxCalendarCard({
  cluster,
  filings,
  roster,
}: {
  cluster: ClusterSlug;
  filings: BirFiling[];
  roster: { id: string; name: string }[];
}) {
  const router = useRouter();
  const [openId, setOpenId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const popoverRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!openId) return;
    function onOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setOpenId(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [openId]);

  function assign(filing: BirFiling, employeeId: string) {
    setOpenId(null);
    startTransition(async () => {
      const taskGeneral = `${filing.code} — ${filing.label} (${filing.periodLabel})`;
      const { id } = await addTaskAction(employeeId, filing.dueDate, taskGeneral);
      router.push(`/${cluster}/employee/${employeeId}?highlight=${id}`);
    });
  }

  return (
    <div className={`${styles.card} ${styles.cardPad}`}>
      <div className={styles.sectionTitleTight}>Tax Calendar (BIR)</div>
      <div className={styles.taxCalSub}>Click a filing, then pick who it&rsquo;s for</div>
      {filings.length === 0 && <div className={styles.emptyNote}>No upcoming filings in range.</div>}
      {filings.map((f) => (
        <div key={f.id} className={styles.taxCalRow}>
          <button
            type="button"
            className={styles.taxCalTrigger}
            onClick={() => setOpenId(openId === f.id ? null : f.id)}
            disabled={pending}
          >
            <span className={styles.taxCalCode}>{f.code}</span>
            <div className={styles.taxCalBody}>
              <div className={styles.taxCalLabel}>{f.label}</div>
              <div className={styles.taxCalPeriod}>{f.periodLabel}</div>
            </div>
            <span className={styles.taxCalDue}>{fmtShort(f.dueDate)}</span>
          </button>
          {openId === f.id && (
            <div ref={popoverRef} className={`${styles.popover} ${styles.taxCalPopover}`}>
              <div className={styles.taxCalPopoverTitle}>Add task for</div>
              {roster.map((r) => (
                <div key={r.id} className={styles.taxCalPopoverRow} onClick={() => assign(f, r.id)}>
                  {r.name}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
