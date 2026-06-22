'use client';

import Link from 'next/link';
import type { CSSProperties } from 'react';
import type { FlatTask } from '@/lib/analytics';
import type { ClusterSlug } from '@/lib/clusters';
import styles from '@/app/[cluster]/summary.module.css';

export default function BlockerRow({
  task,
  cluster,
  dateLabel,
  daysLabel,
  aging,
  avatarStyle,
}: {
  task: FlatTask;
  cluster: ClusterSlug;
  dateLabel: string;
  daysLabel: string;
  aging: boolean;
  avatarStyle: CSSProperties;
}) {
  return (
    <div className={styles.blockerRow}>
      <span className={styles.blockerDate}>{dateLabel}</span>
      <span className={styles.avatar} style={avatarStyle}>
        {task.empName[0]}
      </span>
      <div className={styles.blockerBody}>
        <div className={styles.blockerTitle}>
          {task.empName} <span className={styles.blockerTitleSub}>· {task.taskGeneral}</span>
        </div>
        <div className={styles.blockerText}>{task.helpNeeded}</div>
      </div>
      <div className={styles.blockerRight}>
        <Link href={`/${cluster}/employee/${task.employeeId}?highlight=${task.id}`} className={styles.helpBtn}>
          Help
        </Link>
        <span className={`${styles.agingBadge} ${aging ? styles.agingBadgeHot : ''}`}>{daysLabel}</span>
      </div>
    </div>
  );
}
