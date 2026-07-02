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
  isAdmin,
}: {
  employeeId: string;
  cluster: ClusterSlug;
  name: string;
  isAdmin: boolean;
}) {
  const [confirming, setConfirming] = useState(false);
  const [showRestricted, setShowRestricted] = useState(false);
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
      <button
        className={styles.removeBtn}
        onClick={() => (isAdmin ? setConfirming(true) : setShowRestricted(true))}
        disabled={pending}
      >
        Remove member
      </button>
      {showRestricted && (
        <div
          onClick={() => setShowRestricted(false)}
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 300,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '1.5rem',
            animation: 'modalOverlayIn 0.3s ease forwards',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 14,
              boxShadow: '0 24px 64px rgba(15,23,42,0.35)',
              padding: '32px 36px',
              maxWidth: 400,
              textAlign: 'center',
              animation: 'modalCardIn 0.3s ease-out forwards',
            }}
          >
            <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>
              Admin Only
            </div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, marginBottom: 18 }}>
              Removing a member requires cluster access. Please contact your direct supervisor.
            </p>
            <button
              type="button"
              onClick={() => setShowRestricted(false)}
              style={{
                background: '#0f172a',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                padding: '8px 22px',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
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
