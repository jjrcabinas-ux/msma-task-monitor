'use client';

import { Children, useState, type ReactNode } from 'react';
import styles from '@/app/[cluster]/summary.module.css';

const VISIBLE = 5;

/** Shows the first 5 blocker rows with a "View more" toggle for the rest. */
export default function BlockersList({ children }: { children: ReactNode }) {
  const [expanded, setExpanded] = useState(false);
  const rows = Children.toArray(children);
  const hidden = rows.length - VISIBLE;

  return (
    <>
      {expanded ? rows : rows.slice(0, VISIBLE)}
      {hidden > 0 && (
        <button type="button" className={styles.viewMoreBtn} onClick={() => setExpanded((v) => !v)}>
          {expanded ? 'View less' : `View more (${hidden})`}
        </button>
      )}
    </>
  );
}
