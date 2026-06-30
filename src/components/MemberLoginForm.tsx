'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { memberLoginAction, memberRecoverWithClusterPasswordAction } from '@/lib/actions';
import type { ClusterSlug } from '@/lib/clusters';
import styles from './ClusterGate.module.css';

export default function MemberLoginForm({
  cluster,
  clusterLabel,
}: {
  cluster: ClusterSlug;
  clusterLabel: string;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<'login' | 'recover'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [clusterPassword, setClusterPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function goToCluster() {
    setError('');
    router.push(`/${cluster}`);
    router.refresh();
  }

  function submitLogin() {
    startTransition(async () => {
      const result = await memberLoginAction(cluster, email, password);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      goToCluster();
    });
  }

  function submitRecover() {
    startTransition(async () => {
      const result = await memberRecoverWithClusterPasswordAction(cluster, email, clusterPassword, newPassword);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      goToCluster();
    });
  }

  function switchMode(next: 'login' | 'recover') {
    setMode(next);
    setError('');
    setPassword('');
    setClusterPassword('');
    setNewPassword('');
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Image src="/logo.png" alt="MSMA" width={903} height={495} className={styles.logo} priority />
        <div className={styles.title}>{clusterLabel}</div>

        {mode === 'login' ? (
          <>
            <div className={styles.subtitle}>Log in with your email and password.</div>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
              placeholder="Email address"
              className={styles.input}
              disabled={pending}
            />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
              placeholder="Password"
              className={styles.input}
              disabled={pending}
            />
            {error && <div className={styles.error}>{error}</div>}
            <button onClick={submitLogin} className={styles.btn} disabled={pending}>
              {pending ? 'Checking…' : 'Log in'}
            </button>
            <button type="button" className={styles.memberLoginLink} onClick={() => switchMode('recover')}>
              Don't have a personal password yet? Use the cluster password
            </button>
            <Link href="/signup" className={styles.memberLoginLink}>
              New here? Create an account
            </Link>
          </>
        ) : (
          <>
            <div className={styles.subtitle}>
              Verify with the cluster password, then set a personal password to use from now on.
            </div>
            <input
              autoFocus
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className={styles.input}
              disabled={pending}
            />
            <input
              type="password"
              value={clusterPassword}
              onChange={(e) => setClusterPassword(e.target.value)}
              placeholder="Cluster password"
              className={styles.input}
              disabled={pending}
            />
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && submitRecover()}
              placeholder="New personal password"
              className={styles.input}
              disabled={pending}
            />
            {error && <div className={styles.error}>{error}</div>}
            <button onClick={submitRecover} className={styles.btn} disabled={pending}>
              {pending ? 'Setting password…' : 'Set password & log in'}
            </button>
            <button type="button" className={styles.memberLoginLink} onClick={() => switchMode('login')}>
              Back to normal login
            </button>
          </>
        )}
      </div>
    </div>
  );
}
