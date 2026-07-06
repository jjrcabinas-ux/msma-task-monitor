"use client";

import Link from 'next/link';
import Image from 'next/image';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useMemo, useState, useTransition } from 'react';
import type { ClusterSlug } from '@/lib/types';
import { todayISO, isoToParts, fmtShort } from '@/lib/date';
import { addEmployeeAction } from '@/app/actions';
import styles from './Sidebar.module.css';

type NavEmployee = {
  id: string;
  name: string;
  photo: string | null;
  completionPct: number;
};

/* Data-driven top-level menu. Adding/removing a top-level entry is a one-line
   change here — `type: 'link'` navigates, `type: 'menu'` opens a dropdown whose
   body is rendered by id below. */
type NavItem =
  | { id: 'summary'; type: 'link'; icon: string; label: string }
  | { id: 'members' | 'engagement'; type: 'menu'; icon: string; label: string };

const NAV_ITEMS: NavItem[] = [
  { id: 'summary', type: 'link', icon: '▦', label: 'Team Summary' },
  { id: 'members', type: 'menu', icon: '☰', label: 'Team Members' },
  { id: 'engagement', type: 'menu', icon: '◉', label: 'Engagement Monitoring' },
];

export default function Sidebar({
  cluster,
  clusterLabel,
  todayLabel,
  employees,
  isAdmin,
  viewerName,
}: {
  cluster: ClusterSlug;
  clusterLabel: string;
  todayLabel: string;
  employees: NavEmployee[];
  isAdmin: boolean;
  viewerName: string | null;
}) {
  const pathname = usePathname();
  const router = useRouter();
  // Cosmetic sidebar-brand tweaks are piloted on the ADS cluster only (see memory)
  const isAds = cluster === 'ads';
  const [adding, setAdding] = useState(false);
  const [form, setForm] = useState({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [clientTodayLabel, setClientTodayLabel] = useState(todayLabel);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Single source of truth for which dropdown is expanded (accordion: one at a time)
  const [openMenu, setOpenMenu] = useState<'members' | 'engagement' | null>(() => {
    if (employees.some((emp) => pathname === `/${cluster}/employee/${emp.id}`)) return 'members';
    if (pathname?.startsWith(`/${cluster}/audit`) || pathname?.startsWith(`/${cluster}/special-engagement`)) {
      return 'engagement';
    }
    return null;
  });
  const [taxOpen, setTaxOpen] = useState(false);
  const [showRestricted, setShowRestricted] = useState(false);

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

  // Which top-level item the current route belongs to
  const activeId: string | null =
    pathname?.startsWith(`/${cluster}/employee/`) ? 'members' : pathname?.startsWith(`/${cluster}/audit`) || pathname?.startsWith(`/${cluster}/special-engagement`) ? 'engagement' : 'summary';

  // Keep accordion open for the current section on direct navigation
  useEffect(() => {
    if (activeId === 'members' || activeId === 'engagement') setOpenMenu(activeId);
  }, [activeId]);

  // Close mobile drawer on route change
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const initials = useMemo(() => {
    const src = (viewerName || '').trim();
    if (!src) return 'U';
    const parts = src.split(/\s+/).filter(Boolean);
    return (parts[0]?.[0] || 'U').toUpperCase();
  }, [viewerName]);

  const canSeeRestricted = viewerName === 'Mark Cabañes';

  async function submitAddEmployee(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError('');
    if (!form.name.trim() || !form.nickname.trim() || !form.position.trim()) {
      setError('Name, Nickname, and Position are required.');
      return;
    }

    startTransition(async () => {
      const fd = new FormData();
      fd.set('cluster', cluster);
      fd.set('name', form.name.trim());
      fd.set('nickname', form.nickname.trim());
      fd.set('position', form.position.trim());
      fd.set('email', form.email.trim());
      fd.set('birthDate', form.birthDate);
      fd.set('contactNumber', form.contactNumber.trim());

      const res = await addEmployeeAction(fd);
      if (!res.ok) {
        setError(res.error || 'Failed to add employee.');
        return;
      }

      setAdding(false);
      setForm({ name: '', nickname: '', position: '', email: '', birthDate: '', contactNumber: '' });
      router.refresh();
    });
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
        <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={styles.mobileBarLogo} />
        <span className={styles.mobileBarTitle}>{isAds ? 'ADS CLUSTER' : clusterLabel}</span>
      </div>

      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.aside} ${mobileOpen ? styles.asideOpen : ''} ${isAds ? styles.asideAds : ''}`}>
        <button className={styles.closeDrawerBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>

        <div className={styles.brand}>
          <div className={`${styles.brandRow} ${isAds ? styles.brandRowAds : ''}`}>
            <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={`${styles.logo} ${isAds ? styles.logoAds : ''}`} />
            <div className={styles.brandText}>
              <div className={`${styles.teamName} ${isAds ? styles.teamNameAds : ''}`}>{isAds ? 'ADS CLUSTER' : clusterLabel}</div>
              {!isAds && <div className={styles.subtitle}>Task Monitoring</div>}
            </div>
          </div>
        </div>

        <nav className={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const active = activeId === item.id || (item.type === 'menu' && openMenu === item.id);
            if (item.type === 'link') {
              return (
                <Link
                  key={item.id}
                  href={`/${cluster}`}
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  title={item.label}
                >
                  <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            }

            const expanded = openMenu === item.id;
            return (
              <div key={item.id} className={styles.navGroup}>
                <button
                  type="button"
                  className={`${styles.navItem} ${active ? styles.navItemActive : ''}`}
                  aria-expanded={expanded}
                  onClick={() => {
                    setOpenMenu((cur) => (cur === item.id ? null : item.id));
                    if (item.id !== 'engagement') setTaxOpen(false);
                    if (item.id !== 'members') setAdding(false);
                  }}
                  title={item.label}
                >
                  <span className={styles.navIcon} aria-hidden="true">{item.icon}</span>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={styles.navChevron} aria-hidden="true">{expanded ? '▾' : '▸'}</span>
                </button>

                {item.id === 'members' && expanded && (
                  <div className={styles.submenu}>
                    <div className={styles.memberList}>
                      {employees.map((emp) => {
                        const activeEmp = pathname === `/${cluster}/employee/${emp.id}`;
                        return (
                          <Link key={emp.id} href={`/${cluster}/employee/${emp.id}`} className={`${styles.memberItem} ${activeEmp ? styles.memberItemActive : ''}`}>
                            <span className={styles.memberName}>{emp.name}</span>
                            <span className={styles.memberPct}>{Math.round(emp.completionPct)}%</span>
                          </Link>
                        );
                      })}
                    </div>

                    {isAdmin && (
                      <>
                        <button className={styles.addTrigger} onClick={() => setAdding((v) => !v)}>
                          {adding ? '− Close form' : '+ Add Team Member'}
                        </button>
                        {adding && (
                          <form className={styles.addForm} onSubmit={submitAddEmployee}>
                            <input
                              className={styles.input}
                              placeholder="Full name"
                              value={form.name}
                              onChange={(e) => setForm({ ...form, name: e.target.value })}
                              required
                            />
                            <input
                              className={styles.input}
                              placeholder="Nickname"
                              value={form.nickname}
                              onChange={(e) => setForm({ ...form, nickname: e.target.value })}
                              required
                            />
                            <input
                              className={styles.input}
                              placeholder="Position"
                              value={form.position}
                              onChange={(e) => setForm({ ...form, position: e.target.value })}
                              required
                            />
                            <input
                              className={styles.input}
                              placeholder="Email"
                              type="email"
                              value={form.email}
                              onChange={(e) => setForm({ ...form, email: e.target.value })}
                            />
                            <label className={styles.label}>
                              Birth Date
                              <input
                                className={styles.input}
                                type="date"
                                value={form.birthDate}
                                onChange={(e) => setForm({ ...form, birthDate: e.target.value })}
                              />
                            </label>
                            <input
                              className={styles.input}
                              placeholder="Contact Number"
                              value={form.contactNumber}
                              onChange={(e) => setForm({ ...form, contactNumber: e.target.value })}
                            />
                            {error && <div className={styles.error}>{error}</div>}
                            <button className={styles.submit} disabled={pending}>{pending ? 'Adding…' : 'Add'}</button>
                          </form>
                        )}
                      </>
                    )}
                  </div>
                )}

                {item.id === 'engagement' && expanded && (
                  <div className={styles.submenu}>
                    <button
                      className={styles.memberItem}
                      onClick={() => setTaxOpen((v) => !v)}
                      type="button"
                    >
                      <span className={styles.memberName}>Tax Engagement</span>
                      <span>{taxOpen ? '▾' : '▸'}</span>
                    </button>
                    {taxOpen && (
                      <div className={styles.submenuNested}>
                        <Link href={`/${cluster}/audit/monthly`} className={styles.memberItem}>Monthly Tax Audit</Link>
                        <Link href={`/${cluster}/audit/weekly`} className={styles.memberItem}>Weekly Tax Audit</Link>
                        <Link href={`/${cluster}/special-engagement`} className={styles.memberItem}>Special Engagement</Link>
                        {canSeeRestricted && (
                          <>
                            <button
                              type="button"
                              className={styles.memberItem}
                              onClick={() => setShowRestricted((v) => !v)}
                            >
                              <span className={styles.memberName}>Tax</span>
                              <span>{showRestricted ? '▾' : '▸'}</span>
                            </button>
                            {showRestricted && (
                              <div className={styles.submenuNested}>
                                <Link href={`/${cluster}/tax-revenue`} className={styles.memberItem}>Tax Revenue</Link>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className={styles.footer}>
          <div className={styles.today}>{clientTodayLabel}</div>
          <div className={styles.account}>
            <div className={styles.avatar} aria-hidden="true">{initials}</div>
            <div className={styles.accountMeta}>
              <div className={styles.accountName}>{viewerName || 'User'}</div>
              <div className={styles.accountLabel}>MSMA Team</div>
            </div>
            <form action="/api/auth/signout" method="post">
              <button className={styles.accountLogoutBtn} title="Log out">↗</button>
            </form>
          </div>
        </div>
      </aside>
    </>
  );
}
