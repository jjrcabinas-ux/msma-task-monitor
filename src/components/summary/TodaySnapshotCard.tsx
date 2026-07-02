'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import PhotoAvatar from '@/components/PhotoAvatar';
import styles from '@/app/[cluster]/summary.module.css';

export type SnapshotRow = {
  id: string;
  href: string;
  avatarColor: string;
  avatarLabel: string;
  avatarPhoto: string | null;
  name: string;
  details: string;
  statusLabel: string;
  statusColor: string;
  statusBg: string;
};

export default function TodaySnapshotCard({
  dateLabel,
  rows,
  clipHeight,
}: {
  dateLabel: string;
  rows: SnapshotRow[];
  clipHeight: number | null;
}) {
  const [showAll, setShowAll] = useState(false);
  const [overflowing, setOverflowing] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listRef.current;
    setOverflowing(!!el && clipHeight != null && el.scrollHeight > clipHeight);
  }, [clipHeight, rows]);

  function renderRow(row: SnapshotRow) {
    return (
      <Link key={row.id} href={row.href} className={styles.snapshotRow}>
        <PhotoAvatar
          photo={row.avatarPhoto}
          letter={row.avatarLabel}
          className={styles.avatar}
          style={{ width: 28, height: 28, fontSize: 28 * 0.42, background: row.avatarColor }}
        />
        <div className={styles.snapshotTask}>
          <span className={styles.taskName}>{row.name}</span>
          <span className={styles.taskDetails}> — {row.details}</span>
        </div>
        <span className={styles.statusBadge} style={{ background: row.statusBg, color: row.statusColor }}>
          {row.statusLabel}
        </span>
      </Link>
    );
  }

  return (
    <div className={`${styles.card} ${styles.cardPad}`}>
      <div className={styles.sectionTitleTight}>Today&rsquo;s Snapshot</div>
      <div className={styles.snapshotSub}>{dateLabel} — click a task to open it</div>
      {rows.length === 0 && <div className={styles.emptyNote}>No tasks dated today.</div>}
      <div className={`${styles.snapshotClip} ${overflowing ? styles.snapshotClipFaded : ''}`} style={clipHeight != null ? { maxHeight: clipHeight } : undefined}>
        <div ref={listRef}>{rows.map(renderRow)}</div>
      </div>
      {overflowing && (
        <button type="button" className={styles.seeMoreBtn} onClick={() => setShowAll(true)}>
          See more
        </button>
      )}

      {showAll && (
        <div className={styles.birCalOverlay} onClick={() => setShowAll(false)}>
          <div className={styles.birCalModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.birCalModalHeader}>
              <div className={styles.birCalModalTitle}>Today&rsquo;s Snapshot</div>
              <button type="button" className={styles.birCalModalClose} onClick={() => setShowAll(false)}>
                ×
              </button>
            </div>
            <div className={styles.birCalModalBody}>{rows.map(renderRow)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
