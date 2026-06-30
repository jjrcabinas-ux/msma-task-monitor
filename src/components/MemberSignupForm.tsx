'use client';

import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { memberSignupAction } from '@/lib/actions';
import { CLUSTER_SLUGS, clusterName, type ClusterSlug } from '@/lib/clusters';
import styles from './ClusterGate.module.css';

export default function MemberSignupForm() {
  const router = useRouter();
  const [cluster, setCluster] = useState<ClusterSlug>(CLUSTER_SLUGS[0]);
  const [form, setForm] = useState({
    name: '',
    nickname: '',
    position: '',
    email: '',
    password: '',
    birthDate: '',
    contactNumber: '',
  });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  function updateField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    startTransition(async () => {
      const result = await memberSignupAction(cluster, form);
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
        <div className={styles.title}>Create your account</div>
        <div className={styles.subtitle}>Pick the cluster you belong to and set up your login.</div>

        <select
          value={cluster}
          onChange={(e) => setCluster(e.target.value as ClusterSlug)}
          className={styles.input}
          disabled={pending}
        >
          {CLUSTER_SLUGS.map((slug) => (
            <option key={slug} value={slug}>
              {clusterName(slug)}
            </option>
          ))}
        </select>
        <input
          value={form.name}
          onChange={(e) => updateField('name', e.target.value)}
          placeholder="Full name"
          className={styles.input}
          disabled={pending}
        />
        <input
          value={form.nickname}
          onChange={(e) => updateField('nickname', e.target.value)}
          placeholder="Nickname (display name)"
          className={styles.input}
          disabled={pending}
        />
        <input
          value={form.position}
          onChange={(e) => updateField('position', e.target.value)}
          placeholder="Position"
          className={styles.input}
          disabled={pending}
        />
        <input
          type="email"
          value={form.email}
          onChange={(e) => updateField('email', e.target.value)}
          placeholder="Email address"
          className={styles.input}
          disabled={pending}
        />
        <input
          type="password"
          value={form.password}
          onChange={(e) => updateField('password', e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && submit()}
          placeholder="Choose a password"
          className={styles.input}
          disabled={pending}
        />
        <input
          type="date"
          value={form.birthDate}
          onChange={(e) => updateField('birthDate', e.target.value)}
          className={styles.input}
          disabled={pending}
        />
        <input
          type="tel"
          value={form.contactNumber}
          onChange={(e) => updateField('contactNumber', e.target.value)}
          placeholder="Contact number"
          className={styles.input}
          disabled={pending}
        />
        {error && <div className={styles.error}>{error}</div>}
        <button onClick={submit} className={styles.btn} disabled={pending}>
          {pending ? 'Creating…' : 'Create account'}
        </button>
        <Link href="/" className={styles.memberLoginLink}>
          Already have an account? Go to your cluster to log in
        </Link>
      </div>
    </div>
  );
}
