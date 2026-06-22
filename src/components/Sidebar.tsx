'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';
import { addEmployeeAction } from '@/lib/actions';
import { employeeColor } from '@/lib/colors';
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
  const [name, setName] = useState('');
  const [pending, startTransition] = useTransition();

  const isSummaryActive = pathname === '/';

  function submitAdd() {
    const trimmed = name.trim();
    if (!trimmed) {
      setAdding(false);
      return;
    }
    startTransition(async () => {
      const result = await addEmployeeAction(trimmed);
      setName('');
      setAdding(false);
      if ('id' in result) {
        router.push(`/employee/${result.id}`);
      }
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') submitAdd();
                else if (e.key === 'Escape') setAdding(false);
              }}
              placeholder="New member name"
              className={styles.addInput}
              disabled={pending}
            />
            <div className={styles.addActions}>
              <button onClick={submitAdd} className={styles.addBtn} disabled={pending}>
                Add
              </button>
              <button onClick={() => setAdding(false)} className={styles.cancelBtn} disabled={pending}>
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

      <div className={styles.footer}>{todayLabel}</div>
    </aside>
  );
}
