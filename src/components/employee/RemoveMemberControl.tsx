'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { removeEmployeeAction } from '@/lib/actions';
import type { ClusterSlug } from '@/lib/clusters';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

export default function RemoveMemberControl({
  employeeId,
  cluster,
  name,
}: {
  employeeId: string;
  cluster: ClusterSlug;
  name: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const router = useRouter();

  function confirmRemove() {
    startTransition(async () => {
      const result = await removeEmployeeAction(employeeId, cluster);
      if ('error' in result) {
        setError(result.error);
        setConfirming(false);
      } else {
        router.push(`/${cluster}`);
      }
    });
  }

  return (
    <div style={{ position: 'relative' }}>
      <button className={styles.removeBtn} onClick={() => setConfirming(true)} disabled={pending}>
        Remove member
      </button>
      {error && <div className={styles.errorText}>{error}</div>}
      {confirming && (
        <div className={`${styles.popover} ${styles.confirmPopover}`}>
          <div className={styles.confirmTitle}>Remove {name}?</div>
          <div className={styles.confirmText}>This deletes their sheet and all deliverables. This can&rsquo;t be undone.</div>
          <div className={styles.confirmRow}>
            <button className={styles.confirmRemoveBtn} onClick={confirmRemove} disabled={pending}>
              Remove
            </button>
            <button className={styles.confirmCancelBtn} onClick={() => setConfirming(false)} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
