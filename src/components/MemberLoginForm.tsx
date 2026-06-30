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
  const [showPassword, setShowPassword] = useState(false);
  const [clusterPassword, setClusterPassword] = useState('');
  const [showClusterPassword, setShowClusterPassword] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);
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
    setShowPassword(false);
    setShowClusterPassword(false);
    setShowNewPassword(false);
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
            <div className={styles.inputRow}>
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitLogin()}
                placeholder="Password"
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
            <div className={styles.inputRow}>
              <input
                type={showClusterPassword ? 'text' : 'password'}
                value={clusterPassword}
                onChange={(e) => setClusterPassword(e.target.value)}
                placeholder="Cluster password"
                className={styles.input}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowClusterPassword((v) => !v)}
                className={styles.toggleBtn}
                disabled={pending}
                aria-label={showClusterPassword ? 'Hide password' : 'Show password'}
              >
                {showClusterPassword ? 'Hide' : 'Show'}
              </button>
            </div>
            <div className={styles.inputRow}>
              <input
                type={showNewPassword ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && submitRecover()}
                placeholder="New personal password"
                className={styles.input}
                disabled={pending}
              />
              <button
                type="button"
                onClick={() => setShowNewPassword((v) => !v)}
                className={styles.toggleBtn}
                disabled={pending}
                aria-label={showNewPassword ? 'Hide password' : 'Show password'}
              >
                {showNewPassword ? 'Hide' : 'Show'}
              </button>
            </div>
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
