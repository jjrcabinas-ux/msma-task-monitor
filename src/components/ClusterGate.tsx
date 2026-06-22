'use client';

import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { unlockClusterAction } from '@/lib/actions';
import type { ClusterSlug } from '@/lib/clusters';
import styles from './ClusterGate.module.css';

export default function ClusterGate({
  cluster,
  clusterLabel,
}: {
  cluster: ClusterSlug;
  clusterLabel: string;
}) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await unlockClusterAction(cluster, password);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError('');
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <div className={styles.logo}>M</div>
        <div className={styles.title}>{clusterLabel}</div>
        <div className={styles.subtitle}>Enter the cluster password to continue</div>
        <div className={styles.inputRow}>
          <input
            autoFocus
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && submit()}
            placeholder="Cluster password"
            className={styles.input}
            disabled={pending}
          />
          <button
            type="button"
            onClick={() => setShowPassword((v) => !v)}
            className={styles.toggleBtn}
            disabled={pending}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>
        {error && <div className={styles.error}>{error}</div>}
        <button onClick={submit} className={styles.btn} disabled={pending}>
          {pending ? 'Checking…' : 'Unlock'}
        </button>
      </div>
    </div>
  );
}
