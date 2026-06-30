'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { memberLoginAction } from '@/lib/actions';
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
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function submit() {
    startTransition(async () => {
      const result = await memberLoginAction(cluster, email, password);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError('');
      router.push(`/${cluster}`);
      router.refresh();
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.card}>
        <Image src="/logo.png" alt="MSMA" width={903} height={495} className={styles.logo} priority />
        <div className={styles.title}>{clusterLabel}</div>
        <div className={styles.subtitle}>Log in with your email and password.</div>
        <input
          autoFocus
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Email address"
          className={styles.input}
          disabled={pending}
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Password"
          className={styles.input}
          disabled={pending}
        />
        {error && <div className={styles.error}>{error}</div>}
        <button onClick={submit} className={styles.btn} disabled={pending}>
          {pending ? 'Checking…' : 'Log in'}
        </button>
        <Link href="/signup" className={styles.memberLoginLink}>
          New here? Create an account
        </Link>
      </div>
    </div>
  );
}
