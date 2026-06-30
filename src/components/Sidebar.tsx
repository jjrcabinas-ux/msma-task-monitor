'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addEmployeeAction } from '@/lib/actions';
import type { ClusterSlug } from '@/lib/clusters';
import { employeeColor } from '@/lib/colors';
import { fmtShort, isoToParts, todayISO } from '@/lib/dates';
import styles from './Sidebar.module.css';

type NavEmployee = {
  id: string;
  name: string;
  completionPct: number;
};

export default function Sidebar({
  cluster,
  clusterLabel,
  todayLabel,
  employees,
}: {
  cluster: ClusterSlug;
  clusterLabel: string;
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
  const [mobileOpen, setMobileOpen] = useState(false);
  const [membersOpen, setMembersOpen] = useState(() => employees.some((emp) => pathname === `/${cluster}/employee/${emp.id}`));

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

  const isSummaryActive = pathname === `/${cluster}`;

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
      const result = await addEmployeeAction(cluster, form);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setForm({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
      setError('');
      setAdding(false);
      setMobileOpen(false);
      router.push(`/${cluster}/employee/${result.id}`);
    });
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu">
          ☰
        </button>
        <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={styles.mobileBarLogo} />
        <span className={styles.mobileBarTitle}>{clusterLabel}</span>
      </div>

      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.aside} ${mobileOpen ? styles.asideOpen : ''}`}>
        <button className={styles.closeDrawerBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu">
          ✕
        </button>
        <div className={styles.brand}>
          <div className={styles.brandRow}>
            <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={styles.logo} />
            <div className={styles.brandText}>
              <div className={styles.teamName}>{clusterLabel}</div>
              <div className={styles.subtitle}>Task Monitoring</div>
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          <Link href="/" className={styles.navItem} onClick={() => setMobileOpen(false)}>
            <div className={styles.navIcon}>⌂</div>
            <span className={styles.navLabel}>All Clusters</span>
          </Link>

          <Link
            href={`/${cluster}`}
            className={`${styles.navItem} ${isSummaryActive ? styles.navItemActive : ''}`}
            onClick={() => setMobileOpen(false)}
          >
            <div className={styles.navIcon}>▦</div>
            <span className={styles.navLabel}>Team Summary</span>
          </Link>

          <button
            type="button"
            className={styles.sectionLabel}
            onClick={() => setMembersOpen((v) => !v)}
            aria-expanded={membersOpen}
          >
            <span>TEAM MEMBERS</span>
            <span className={`${styles.sectionLabelChevron} ${membersOpen ? styles.sectionLabelChevronOpen : ''}`}>▶</span>
          </button>

          {membersOpen && (
            <>
              <div className={styles.memberListScroll}>
                {employees.map((emp, idx) => {
                  const active = pathname === `/${cluster}/employee/${emp.id}`;
                  return (
                    <Link
                      key={emp.id}
                      href={`/${cluster}/employee/${emp.id}`}
                      className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                      onClick={() => setMobileOpen(false)}
                    >
                      <div className={styles.navAvatar} style={{ background: employeeColor(idx) }}>
                        {emp.name[0]}
                      </div>
                      <span className={styles.navName}>{emp.name}</span>
                      <span className={styles.navPct}>{emp.completionPct}%</span>
                    </Link>
                  );
                })}
              </div>

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
            </>
          )}
        </nav>

        <div className={styles.footer}>{clientTodayLabel}</div>
      </aside>
    </>
  );
}
