'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addEmployeeAction } from '@/lib/actions';
import { employeeColor } from '@/lib/colors';
import { fmtShort, isoToParts, todayISO } from '@/lib/dates';
import styles from './Sidebar.module.css';

type NavEmployee = {
  id: string;
  name: string;
  completionPct: number;
};

export default function Sidebar({
  teamName,
  todayLabel,
  employees,
}: {
  teamName: string;
  todayLabel: string;
  employees: NavEmployee[];
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [clientTodayLabel, setClientTodayLabel] = useState(todayLabel);

  useEffect(() => {
    function syncLabel() {
      const iso = todayISO();
      const { y } = isoToParts(iso);
      setClientTodayLabel(`Today · ${fmtShort(iso)}, ${y}`);
    }
    syncLabel();
    const interval = setInterval(syncLabel, 60000);
    return () => clearInterval(interval);
  }, []);

  const isSummaryActive = pathname === '/';

  function updateField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function cancelAdd() {
    setAdding(false);
    setForm({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
    setError('');
  }

  function submitAdd() {
    startTransition(async () => {
      const result = await addEmployeeAction(form);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setForm({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
      setError('');
      setAdding(false);
      router.push(`/employee/${result.id}`);
    });
  }

  return (
    <aside className={styles.aside}>
      <div className={styles.brand}>
        <div className={styles.brandRow}>
          <div className={styles.logo}>M</div>
          <div className={styles.brandText}>
            <div className={styles.teamName}>{teamName}</div>
            <div className={styles.subtitle}>Task Monitoring</div>
          </div>
        </div>
      </div>

      <nav className={styles.nav}>
        <Link href="/" className={`${styles.navItem} ${isSummaryActive ? styles.navItemActive : ''}`}>
          <div className={styles.navIcon}>▦</div>
          <span className={styles.navLabel}>Team Summary</span>
        </Link>

        <div className={styles.sectionLabel}>TEAM MEMBERS</div>

        {employees.map((emp, idx) => {
          const active = pathname === `/employee/${emp.id}`;
          return (
            <Link
              key={emp.id}
              href={`/employee/${emp.id}`}
              className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
            >
              <div className={styles.navAvatar} style={{ background: employeeColor(idx) }}>
                {emp.name[0]}
              </div>
              <span className={styles.navName}>{emp.name}</span>
              <span className={styles.navPct}>{emp.completionPct}%</span>
            </Link>
          );
        })}

        {adding ? (
          <div className={styles.addBox}>
            <input
              autoFocus
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder="Full name"
              className={styles.addInput}
              disabled={pending}
            />
            <input
              value={form.nickname}
              onChange={(e) => updateField('nickname', e.target.value)}
              placeholder="Nickname (display name)"
              className={styles.addInput}
              disabled={pending}
            />
            <input
              value={form.position}
              onChange={(e) => updateField('position', e.target.value)}
              placeholder="Position"
              className={styles.addInput}
              disabled={pending}
            />
            <input
              type="email"
              value={form.email}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder="Email address"
              className={styles.addInput}
              disabled={pending}
            />
            <label className={styles.addFieldLabel}>Birth date</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={(e) => updateField('birthDate', e.target.value)}
              className={styles.addInput}
              disabled={pending}
            />
            <input
              type="tel"
              value={form.contactNumber}
              onChange={(e) => updateField('contactNumber', e.target.value)}
              placeholder="Contact number"
              className={styles.addInput}
              disabled={pending}
            />
            {error && <div className={styles.addError}>{error}</div>}
            <div className={styles.addActions}>
              <button onClick={submitAdd} className={styles.addBtn} disabled={pending}>
                Add
              </button>
              <button onClick={cancelAdd} className={styles.cancelBtn} disabled={pending}>
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className={styles.addTrigger} onClick={() => setAdding(true)}>
            <div className={styles.addIcon}>+</div>
            <span className={styles.navLabel}>Add member</span>
          </div>
        )}
      </nav>

      <div className={styles.footer}>{clientTodayLabel}</div>
    </aside>
  );
}
