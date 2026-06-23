'use client';

import { useEffect, useRef, useState } from 'react';
import TaxCalendarCard from './TaxCalendarCard';
import TodaySnapshotCard, { type SnapshotRow } from './TodaySnapshotCard';
import type { ClusterSlug } from '@/lib/clusters';
import styles from '@/app/[cluster]/summary.module.css';

export default function TodayRow({
  cluster,
  roster,
  todayIso,
  dateLabel,
  rows,
}: {
  cluster: ClusterSlug;
  roster: { id: string; name: string }[];
  todayIso: string;
  dateLabel: string;
  rows: SnapshotRow[];
}) {
  const calendarRef = useRef<HTMLDivElement>(null);
  const [clipHeight, setClipHeight] = useState<number | null>(null);

  useEffect(() => {
    const el = calendarRef.current;
    if (!el) return;
    const update = () => setClipHeight(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return (
    <div className={`${styles.twoColUneven} ${styles.twoColUnevenTop}`}>
      <TodaySnapshotCard dateLabel={dateLabel} rows={rows} clipHeight={clipHeight} />
      <div ref={calendarRef}>
        <TaxCalendarCard cluster={cluster} roster={roster} todayIso={todayIso} />
      </div>
    </div>
  );
}
