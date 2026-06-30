'use client';

import Link from 'next/link';
import { useState } from 'react';
import { createPortal } from 'react-dom';
import type { ClusterSlug } from '@/lib/clusters';
import { fmtShort } from '@/lib/dates';
import type { Status, TaskDTO } from '@/lib/types';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

const STAT_CONFIG: { key: Status; color: string }[] = [
  { key: 'Done', color: '#16a34a' },
  { key: 'Ongoing', color: '#3b82f6' },
  { key: 'Pending', color: '#f59e0b' },
];

export default function StatsSummaryBar({
  tasks,
  cluster,
  employeeId,
  counts,
}: {
  tasks: TaskDTO[];
  cluster: ClusterSlug;
  employeeId: string;
  counts: { Done: number; Ongoing: number; Pending: number };
}) {
  const [openStatus, setOpenStatus] = useState<Status | null>(null);
  const total = tasks.length;
  const seg = (n: number) => (total ? (n / total) * 100 : 0);
  const matching = openStatus ? tasks.filter((t) => t.status === openStatus) : [];

  return (
    <>
      <div className={styles.statsBarWrap}>
        <div className={styles.statsBar}>
          <div style={{ width: `${seg(counts.Done)}%`, background: '#16a34a' }} />
          <div style={{ width: `${seg(counts.Ongoing)}%`, background: '#3b82f6' }} />
          <div style={{ width: `${seg(counts.Pending)}%`, background: '#f59e0b' }} />
        </div>
      </div>
      <div className={styles.statsNumbers}>
        {STAT_CONFIG.map((s) => (
          <button key={s.key} type="button" className={styles.statBlock} onClick={() => setOpenStatus(s.key)}>
            <div className={styles.statLabel}>{s.key}</div>
            <div className={styles.statValue} style={{ color: s.color }}>
              {counts[s.key]}
            </div>
          </button>
        ))}
      </div>
      {openStatus &&
        createPortal(
          <div className={styles.addModalOverlay} onClick={() => setOpenStatus(null)}>
            <div className={styles.addModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.addModalHeader}>
                <div className={styles.addModalTitle}>
                  {openStatus} ({matching.length})
                </div>
                <button type="button" className={styles.addModalClose} onClick={() => setOpenStatus(null)} aria-label="Close">
                  ×
                </button>
              </div>
              <div className={styles.statModalBody}>
                {matching.length === 0 && (
                  <div className={styles.statModalEmpty}>No {openStatus.toLowerCase()} deliverables.</div>
                )}
                {matching.map((t) => (
                  <Link
                    key={t.id}
                    href={`/${cluster}/employee/${employeeId}?highlight=${t.id}`}
                    className={styles.statModalRow}
                    onClick={() => setOpenStatus(null)}
                  >
                    <div className={styles.statModalRowTitle}>{t.taskGeneral || '(untitled)'}</div>
                    <div className={styles.statModalRowSub}>
                      {t.date ? fmtShort(t.date) : 'No date'}
                      {t.dueDate ? ` · Due ${fmtShort(t.dueDate)}` : ''}
                    </div>
                  </Link>
                ))}
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
