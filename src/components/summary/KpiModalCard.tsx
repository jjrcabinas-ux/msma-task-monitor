'use client';

import { useState, type ReactNode } from 'react';
import styles from './KpiModalCard.module.css';

export default function KpiModalCard({ card, title, children }: { card: ReactNode; title: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" className={styles.trigger} onClick={() => setOpen(true)}>
        {card}
      </button>
      {open && (
        <div className={styles.overlay} onClick={() => setOpen(false)}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <div className={styles.modalTitle}>{title}</div>
              <button type="button" className={styles.closeBtn} onClick={() => setOpen(false)}>
                ×
              </button>
            </div>
            <div className={styles.modalBody}>{children}</div>
          </div>
        </div>
      )}
    </>
  );
}
