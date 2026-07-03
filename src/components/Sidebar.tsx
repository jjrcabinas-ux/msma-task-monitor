'use client';

import Image from 'next/image';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addEmployeeAction, memberLogoutAction } from '@/lib/actions';
import type { ClusterSlug } from '@/lib/clusters';
import { employeeColor } from '@/lib/colors';
import { fmtShort, isoToParts, todayISO } from '@/lib/dates';
import PhotoAvatar from './PhotoAvatar';
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
  const [collapsed, setCollapsed] = useState(false);

  // Restore collapsed preference, then keep the layout's content margin in sync
  useEffect(() => {
    setCollapsed(localStorage.getItem('sidebar_collapsed') === 'true');
  }, []);
  useEffect(() => {
    document.documentElement.dataset.sidebarCollapsed = collapsed ? 'true' : 'false';
    localStorage.setItem('sidebar_collapsed', collapsed ? 'true' : 'false');
  }, [collapsed]);

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
    pathname === `/${cluster}`
      ? 'summary'
      : employees.some((emp) => pathname === `/${cluster}/employee/${emp.id}`)
        ? 'members'
        : pathname.startsWith(`/${cluster}/audit`) || pathname.startsWith(`/${cluster}/special-engagement`)
          ? 'engagement'
          : null;

  function toggleMenu(id: 'members' | 'engagement') {
    if (collapsed) setCollapsed(false); // expand so the panel is usable
    setTaxOpen(false);
    setOpenMenu((cur) => (cur === id ? null : id));
  }

  // Called by any real navigation — collapse all dropdowns and close the drawer
  function onNavigate() {
    setMobileOpen(false);
    setOpenMenu(null);
    setTaxOpen(false);
  }

  function logout() {
    startTransition(async () => {
      await memberLogoutAction(cluster);
      router.refresh();
    });
  }

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

  /* ── Dropdown bodies, keyed by menu id ── */
  function renderMenuBody(id: 'members' | 'engagement') {
    if (id === 'members') {
      return (
        <div className={openMenu === 'members' ? styles.dropdownPanelOpen : styles.dropdownPanel}>
          <div className={styles.memberListScroll}>
            {employees.map((emp, idx) => (
              <Link
                key={emp.id}
                href={`/${cluster}/employee/${emp.id}`}
                className={`${styles.navItem} ${pathname === `/${cluster}/employee/${emp.id}` ? styles.navItemActive : ''}`}
                onClick={onNavigate}
              >
                <PhotoAvatar
                  photo={emp.photo}
                  letter={emp.name[0]}
                  className={styles.navAvatar}
                  style={{ background: employeeColor(idx) }}
                />
                <span className={styles.navName}>{emp.name}</span>
                <span className={styles.navPct}>{emp.completionPct}%</span>
              </Link>
            ))}
          </div>

          {isAdmin &&
            (adding ? (
              <div className={styles.addBox}>
                <input autoFocus value={form.name} onChange={(e) => updateField('name', e.target.value)} placeholder="Full name" className={styles.addInput} disabled={pending} />
                <input value={form.nickname} onChange={(e) => updateField('nickname', e.target.value)} placeholder="Nickname (display name)" className={styles.addInput} disabled={pending} />
                <input value={form.position} onChange={(e) => updateField('position', e.target.value)} placeholder="Position" className={styles.addInput} disabled={pending} />
                <input type="email" value={form.email} onChange={(e) => updateField('email', e.target.value)} placeholder="Email address" className={styles.addInput} disabled={pending} />
                <label className={styles.addFieldLabel}>Birth date</label>
                <input type="date" value={form.birthDate} onChange={(e) => updateField('birthDate', e.target.value)} className={styles.addInput} disabled={pending} />
                <input type="tel" value={form.contactNumber} onChange={(e) => updateField('contactNumber', e.target.value)} placeholder="Contact number" className={styles.addInput} disabled={pending} />
                {error && <div className={styles.addError}>{error}</div>}
                <div className={styles.addActions}>
                  <button onClick={submitAdd} className={styles.addBtn} disabled={pending}>Add</button>
                  <button onClick={cancelAdd} className={styles.cancelBtn} disabled={pending}>Cancel</button>
                </div>
              </div>
            ) : (
              <div className={styles.addTrigger} onClick={() => setAdding(true)}>
                <div className={styles.addIcon}>+</div>
                <span className={styles.navLabel}>Add member</span>
              </div>
            ))}
        </div>
      );
    }

    // engagement
    return (
      <div className={openMenu === 'engagement' ? styles.dropdownPanelOpen : styles.dropdownPanel}>
        <div className={styles.subNav}>
          <Link
            href={`/${cluster}/audit`}
            className={`${styles.subNavItem} ${pathname.startsWith(`/${cluster}/audit`) ? styles.subNavItemActive : ''}`}
            onClick={() => { setMobileOpen(false); setTaxOpen(false); }}
          >
            Audit Monitoring
          </Link>

          <button type="button" className={styles.subNavItem} onClick={() => setTaxOpen((v) => !v)} aria-expanded={taxOpen}>
            Tax Compliance Monitoring
            <span className={styles.soonBadge}>Soon</span>
          </button>

          <div className={taxOpen ? styles.dropdownPanelOpen : styles.dropdownPanel}>
            <div className={styles.comingSoonBox}>
              <p className={styles.comingSoonLead}>Keep tax filing deadlines and statutory compliance visible per client.</p>
              <ul className={styles.comingSoonList}>
                <li>Track BIR/SEC filing due dates and submission status</li>
                <li>Alert on upcoming and missed compliance deadlines</li>
                <li>Assign filings to team members and monitor completion</li>
              </ul>
            </div>
          </div>

          {isAdmin ? (
            <Link
              href={`/${cluster}/special-engagement`}
              className={`${styles.subNavItem} ${pathname.startsWith(`/${cluster}/special-engagement`) ? styles.subNavItemActive : ''}`}
              onClick={() => { setMobileOpen(false); setTaxOpen(false); }}
            >
              Special Engagement Monitoring
            </Link>
          ) : (
            <button type="button" className={styles.subNavItem} onClick={() => setShowRestricted(true)}>
              Special Engagement Monitoring
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <>
      <div className={styles.mobileBar}>
        <button className={styles.hamburger} onClick={() => setMobileOpen(true)} aria-label="Open menu">☰</button>
        <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={styles.mobileBarLogo} />
        <span className={styles.mobileBarTitle}>{clusterLabel}</span>
      </div>

      {mobileOpen && <div className={styles.overlay} onClick={() => setMobileOpen(false)} />}

      <aside className={`${styles.aside} ${mobileOpen ? styles.asideOpen : ''} ${collapsed ? styles.collapsed : ''}`}>
        <button className={styles.closeDrawerBtn} onClick={() => setMobileOpen(false)} aria-label="Close menu">✕</button>

        <div className={styles.brand}>
          <div className={`${styles.brandRow} ${isAds ? styles.brandRowAds : ''}`}>
            <button
              type="button"
              className={styles.collapseBtn}
              onClick={() => { setCollapsed((v) => !v); setOpenMenu(null); setTaxOpen(false); }}
              title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" width="21" height="21" aria-hidden="true">
                <path d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Image src="/logo-white.png" alt="MSMA" width={903} height={495} className={`${styles.logo} ${isAds ? styles.logoAds : ''}`} />
            <div className={styles.brandText}>
              <div className={`${styles.teamName} ${isAds ? styles.teamNameAds : ''}`}>{clusterLabel}</div>
              <div className={styles.subtitle}>Task Monitoring</div>
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
                  onClick={onNavigate}
                  title={item.label}
                >
                  <div className={styles.navIcon}>{item.icon}</div>
                  <span className={styles.navLabel}>{item.label}</span>
                </Link>
              );
            }
            return (
              <div key={item.id}>
                <button
                  type="button"
                  className={`${styles.navItem} ${styles.navItemToggle} ${active ? styles.navItemActive : ''}`}
                  onClick={() => toggleMenu(item.id)}
                  aria-expanded={openMenu === item.id}
                  title={item.label}
                >
                  <div className={styles.navIcon}>{item.icon}</div>
                  <span className={styles.navLabel}>{item.label}</span>
                  <span className={`${styles.navChevron} ${openMenu === item.id ? styles.navChevronOpen : ''}`}>▶</span>
                </button>
                {renderMenuBody(item.id)}
              </div>
            );
          })}
        </nav>

        <div className={styles.bottomLinks}>
          {viewerName ? (
            <div className={styles.accountRow}>
              <span className={styles.accountLabel}>Logged in as {viewerName}</span>
              <button type="button" className={styles.accountLogoutBtn} onClick={logout} disabled={pending}>Log out</button>
            </div>
          ) : (
            <Link href={`/login/${cluster}`} className={styles.navItem} onClick={() => setMobileOpen(false)} title="Log in">
              <div className={styles.navIcon}>👤</div>
              <span className={styles.navLabel}>{isAdmin ? 'Log in as a member' : 'Log in'}</span>
            </Link>
          )}
          <Link href="/" className={styles.navItem} onClick={() => setMobileOpen(false)} title="All Clusters">
            <div className={styles.navIcon}>⌂</div>
            <span className={styles.navLabel}>All Clusters</span>
          </Link>
        </div>

        <div className={styles.footer}>{clientTodayLabel}</div>
      </aside>

      {showRestricted && (
        <div
          onClick={() => setShowRestricted(false)}
          style={{ position: 'fixed', inset: 0, zIndex: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1.5rem', animation: 'modalOverlayIn 0.3s ease forwards' }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{ background: '#fff', borderRadius: 14, boxShadow: '0 24px 64px rgba(15,23,42,0.35)', padding: '32px 36px', maxWidth: 400, textAlign: 'center', animation: 'modalCardIn 0.3s ease-out forwards' }}
          >
            <div style={{ fontSize: 30, marginBottom: 8 }}>🔒</div>
            <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#0f172a', marginBottom: 6 }}>Access Restricted</div>
            <p style={{ fontSize: '0.88rem', color: '#64748b', lineHeight: 1.6, marginBottom: 18 }}>
              Special Engagement Monitoring is only available with cluster access. Please contact your direct supervisor if you need access.
            </p>
            <button
              type="button"
              onClick={() => setShowRestricted(false)}
              style={{ background: '#0f172a', color: '#fff', border: 'none', borderRadius: 8, padding: '8px 22px', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
}
