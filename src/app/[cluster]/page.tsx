import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getRosterWithTasks } from '@/lib/data';
import { isClusterSlug } from '@/lib/clusters';
import { isAdminUnlocked } from '@/lib/memberAuth';
import { periodRange } from '@/lib/period';
import { todayISO, fmtLongFromIso, fmtShort } from '@/lib/dates';
import {
  buildKpis,
  buildTrend,
  buildWorkload,
  buildLeaderboard,
  buildTodaySnapshot,
  buildEmployeeCards,
  buildBlockers,
  ringGeometry,
  teamStackedBar,
  employeeColor,
} from '@/lib/analytics';
import type { Period } from '@/lib/types';
import PeriodFilter from '@/components/PeriodFilter';
import KpiModalCard from '@/components/summary/KpiModalCard';
import BlockerRow from '@/components/summary/BlockerRow';
import MemberRow from '@/components/summary/MemberRow';
import TodayRow from '@/components/summary/TodayRow';
import modalStyles from '@/components/summary/KpiModalCard.module.css';
import styles from './summary.module.css';

const STATUS_META = {
  Pending: { label: 'Pending', color: '#b45309', bg: '#fef3c7' },
  Ongoing: { label: 'Ongoing', color: '#1d4ed8', bg: '#dbeafe' },
  Done: { label: 'Done', color: '#15803d', bg: '#dcfce7' },
} as const;

function avatarStyle(size: number, color: string): React.CSSProperties {
  return { width: size, height: size, fontSize: size * 0.42, background: color };
}

export default async function SummaryPage({
  params,
  searchParams,
}: {
  params: Promise<{ cluster: string }>;
  searchParams: Promise<{ period?: string; start?: string; end?: string }>;
}) {
  const { cluster: clusterParam } = await params;
  if (!isClusterSlug(clusterParam)) notFound();
  const cluster = clusterParam;

  const sp = await searchParams;
  const period: Period = (['week', 'month', 'year', 'custom'].includes(sp.period || '') ? sp.period : 'week') as Period;
  const today = todayISO();
  const range = periodRange(period, sp.start, sp.end);

  const isAdmin = await isAdminUnlocked(cluster);
  const roster = await getRosterWithTasks(cluster);
  const kpi = buildKpis(roster, range, today);
  const ring = ringGeometry(kpi.completionPct);
  const trend = buildTrend(kpi.periodTasks);
  const workload = buildWorkload(roster, range);
  const leaderboard = buildLeaderboard(roster, range);
  const SNAPSHOT_STATUS_ORDER = { Done: 0, Ongoing: 1, Pending: 2 } as const;
  const todayRows = buildTodaySnapshot(roster, today).sort(
    (a, b) => SNAPSHOT_STATUS_ORDER[a.task.status] - SNAPSHOT_STATUS_ORDER[b.task.status]
  );
  const snapshotRows = todayRows.map(({ task }) => ({
    id: task.id,
    href: `/${cluster}/employee/${task.employeeId}?highlight=${task.id}`,
    avatarColor: employeeColor(task.empIndex),
    avatarLabel: task.empName[0],
    name: task.taskGeneral || '(untitled)',
    details: task.taskDetails,
    statusLabel: STATUS_META[task.status].label,
    statusColor: STATUS_META[task.status].color,
    statusBg: STATUS_META[task.status].bg,
  }));
  const empCards = buildEmployeeCards(roster);
  const blockers = buildBlockers(roster, today);
  const teamBar = teamStackedBar(kpi.done, kpi.ongoing, kpi.pending, kpi.total);
  const taxRoster = roster.map(({ employee }) => ({ id: employee.id, name: employee.name }));

  return (
    <div className={styles.page}>
      <div className={styles.headerRow}>
        <div>
          <h1 className={styles.h1}>Team Summary</h1>
          <div className={styles.dateLabel}>{fmtLongFromIso(today)}</div>
          <div className={styles.periodLabel}>Metrics shown {range.label}</div>
        </div>
        <PeriodFilter period={period} customStart={sp.start || ''} customEnd={sp.end || ''} />
      </div>

      <div className={styles.kpiGrid}>
        <div className={`${styles.card} ${styles.kpiCardRing}`}>
          <div className={styles.ringWrap}>
            <svg viewBox="0 0 128 128" className={styles.ringSvg}>
              <circle cx="64" cy="64" r="54" fill="none" stroke="#eef1f5" strokeWidth="13" />
              <circle
                cx="64"
                cy="64"
                r="54"
                fill="none"
                stroke="#2563eb"
                strokeWidth="13"
                strokeLinecap="round"
                strokeDasharray={ring.dasharray}
                strokeDashoffset={ring.dashoffset}
              />
            </svg>
            <div className={styles.ringLabel}>{kpi.completionPct}%</div>
          </div>
          <div>
            <div className={styles.kpiLabel}>Completion</div>
            <div className={styles.subRow}>
              {kpi.done} of {kpi.total} done
            </div>
          </div>
        </div>
        <KpiModalCard
          title={`Pending Tasks (${kpi.pending})`}
          card={
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.kpiLabel}>Pending</div>
              <div className={styles.kpiNumber} style={{ color: '#b45309' }}>
                {kpi.pending}
              </div>
            </div>
          }
        >
          {kpi.periodTasks.filter((t) => t.status === 'Pending').length === 0 && (
            <div className={modalStyles.modalEmpty}>No pending tasks in this period.</div>
          )}
          {kpi.periodTasks
            .filter((t) => t.status === 'Pending')
            .map((t) => (
              <Link key={t.id} href={`/${cluster}/employee/${t.employeeId}?highlight=${t.id}`} className={modalStyles.modalRow}>
                <span className={styles.avatar} style={avatarStyle(28, employeeColor(t.empIndex))}>
                  {t.empName[0]}
                </span>
                <div className={modalStyles.modalRowBody}>
                  <div className={modalStyles.modalRowTitle}>{t.taskGeneral || '(untitled)'}</div>
                  <div className={modalStyles.modalRowSub}>
                    {t.empName}
                    {t.date ? ` · ${fmtShort(t.date)}` : ''}
                  </div>
                </div>
                <span className={styles.statusBadge} style={{ background: STATUS_META.Pending.bg, color: STATUS_META.Pending.color }}>
                  {STATUS_META.Pending.label}
                </span>
              </Link>
            ))}
        </KpiModalCard>

        <KpiModalCard
          title={`Ongoing Tasks (${kpi.ongoing})`}
          card={
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.kpiLabel}>Ongoing</div>
              <div className={styles.kpiNumber} style={{ color: '#1d4ed8' }}>
                {kpi.ongoing}
              </div>
            </div>
          }
        >
          {kpi.periodTasks.filter((t) => t.status === 'Ongoing').length === 0 && (
            <div className={modalStyles.modalEmpty}>No ongoing tasks in this period.</div>
          )}
          {kpi.periodTasks
            .filter((t) => t.status === 'Ongoing')
            .map((t) => (
              <Link key={t.id} href={`/${cluster}/employee/${t.employeeId}?highlight=${t.id}`} className={modalStyles.modalRow}>
                <span className={styles.avatar} style={avatarStyle(28, employeeColor(t.empIndex))}>
                  {t.empName[0]}
                </span>
                <div className={modalStyles.modalRowBody}>
                  <div className={modalStyles.modalRowTitle}>{t.taskGeneral || '(untitled)'}</div>
                  <div className={modalStyles.modalRowSub}>
                    {t.empName}
                    {t.date ? ` · ${fmtShort(t.date)}` : ''}
                  </div>
                </div>
                <span className={styles.statusBadge} style={{ background: STATUS_META.Ongoing.bg, color: STATUS_META.Ongoing.color }}>
                  {STATUS_META.Ongoing.label}
                </span>
              </Link>
            ))}
        </KpiModalCard>

        <KpiModalCard
          title={`Completed Tasks (${kpi.done})`}
          card={
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.kpiLabel}>Completed</div>
              <div className={styles.kpiNumber} style={{ color: '#16a34a' }}>
                {kpi.done}
              </div>
            </div>
          }
        >
          {kpi.periodTasks.filter((t) => t.status === 'Done').length === 0 && (
            <div className={modalStyles.modalEmpty}>No completed tasks in this period.</div>
          )}
          {kpi.periodTasks
            .filter((t) => t.status === 'Done')
            .map((t) => (
              <Link key={t.id} href={`/${cluster}/employee/${t.employeeId}?highlight=${t.id}`} className={modalStyles.modalRow}>
                <span className={styles.avatar} style={avatarStyle(28, employeeColor(t.empIndex))}>
                  {t.empName[0]}
                </span>
                <div className={modalStyles.modalRowBody}>
                  <div className={modalStyles.modalRowTitle}>{t.taskGeneral || '(untitled)'}</div>
                  <div className={modalStyles.modalRowSub}>
                    {t.empName}
                    {t.date ? ` · ${fmtShort(t.date)}` : ''}
                  </div>
                </div>
                <span className={styles.statusBadge} style={{ background: STATUS_META.Done.bg, color: STATUS_META.Done.color }}>
                  {STATUS_META.Done.label}
                </span>
              </Link>
            ))}
        </KpiModalCard>

        <KpiModalCard
          title={`Open Blockers (${blockers.length})`}
          card={
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.kpiLabel}>Open Blockers</div>
              <div className={styles.kpiNumber} style={{ color: '#dc2626' }}>
                {kpi.blockerCount}
              </div>
            </div>
          }
        >
          {blockers.length === 0 && <div className={modalStyles.modalEmpty}>No blockers reported.</div>}
          {blockers.map(({ task, dateLabel }) => (
            <Link key={task.id} href={`/${cluster}/employee/${task.employeeId}?highlight=${task.id}`} className={modalStyles.modalRow}>
              <span className={styles.avatar} style={avatarStyle(28, employeeColor(task.empIndex))}>
                {task.empName[0]}
              </span>
              <div className={modalStyles.modalRowBody}>
                <div className={modalStyles.modalRowTitle}>
                  {task.empName} · {task.taskGeneral || '(untitled)'}
                </div>
                <div className={modalStyles.modalRowSub}>{task.helpNeeded}</div>
              </div>
              <span className={modalStyles.modalRowSub}>{dateLabel}</span>
            </Link>
          ))}
        </KpiModalCard>

        <KpiModalCard
          title={`Team Members (${kpi.members})`}
          card={
            <div className={`${styles.card} ${styles.kpiCard}`}>
              <div className={styles.kpiLabel}>Members</div>
              <div className={styles.kpiNumber}>{kpi.members}</div>
            </div>
          }
        >
          <div className={modalStyles.memberListScroll}>
            {roster.map(({ employee }, idx) => (
              <MemberRow
                key={employee.id}
                employee={employee}
                cluster={cluster}
                avatarStyle={avatarStyle(34, employeeColor(idx))}
                canEdit={isAdmin}
              />
            ))}
          </div>
        </KpiModalCard>
      </div>

      <TodayRow cluster={cluster} roster={taxRoster} todayIso={today} dateLabel={fmtLongFromIso(today)} rows={snapshotRows} />

      <div className={styles.twoCol}>
        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.sectionTitle}>Task Status — Whole Team</div>
          <div className={styles.stackBar}>
            <div style={{ width: `${teamBar.donePct}%`, background: '#16a34a' }} />
            <div style={{ width: `${teamBar.ongoingPct}%`, background: '#3b82f6' }} />
            <div style={{ width: `${teamBar.pendingPct}%`, background: '#f59e0b' }} />
          </div>
          <div className={styles.legendRow}>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#16a34a' }} />
              <span className={styles.legendLabel}>Done</span>
              <span className={styles.legendValue}>{kpi.done}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#3b82f6' }} />
              <span className={styles.legendLabel}>Ongoing</span>
              <span className={styles.legendValue}>{kpi.ongoing}</span>
            </div>
            <div className={styles.legendItem}>
              <span className={styles.legendDot} style={{ background: '#f59e0b' }} />
              <span className={styles.legendLabel}>Pending</span>
              <span className={styles.legendValue}>{kpi.pending}</span>
            </div>
          </div>
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.sectionTitleTight}>Tasks Completed Over Time</div>
          {trend.hasData && (
            <svg viewBox="0 0 320 112" style={{ width: '100%', height: 118, display: 'block' }}>
              <line x1="20" y1="92" x2="300" y2="92" stroke="#e6e9ef" strokeWidth="1" />
              <path d={trend.areaPath} fill="rgba(37,99,235,.10)" />
              <path d={trend.linePath} fill="none" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
              {trend.points.map((p, i) => (
                <g key={i}>
                  <circle cx={p.cx} cy={p.cy} r="3.5" fill="#fff" stroke="#2563eb" strokeWidth="2" />
                  <text x={p.cx} y="106" textAnchor="middle" fontSize="9" fill="#94a3b8">
                    {p.label}
                  </text>
                  <text x={p.cx} y={p.valueY} textAnchor="middle" fontSize="10" fontWeight="700" fill="#0f172a">
                    {p.value}
                  </text>
                </g>
              ))}
            </svg>
          )}
        </div>
      </div>

      <div className={styles.twoColUneven}>
        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.sectionTitle}>Workload — Tasks per Person</div>
          {workload.map((w) => (
            <Link key={w.id} href={`/${cluster}/employee/${w.id}`} className={styles.workloadRow}>
              <span className={styles.workloadName}>{w.name}</span>
              <div className={styles.barTrack}>
                <div className={styles.barFill} style={{ width: `${w.pct}%` }} />
              </div>
              <span className={styles.workloadCount}>{w.count}</span>
            </Link>
          ))}
        </div>

        <div className={`${styles.card} ${styles.cardPad}`}>
          <div className={styles.sectionTitleTight}>Leaderboard</div>
          <div className={styles.lbSubtitle}>Tasks completed {range.label}</div>
          {leaderboard.map((l) => (
            <Link key={l.id} href={`/${cluster}/employee/${l.id}`} className={styles.lbRow}>
              <span className={`${styles.lbRank} ${l.isTop ? styles.lbRankTop : ''}`}>{l.rank}</span>
              <span className={styles.lbName}>{l.name}</span>
              <div className={styles.lbBarTrack}>
                <div className={`${styles.lbBarFill} ${l.isTop ? styles.lbBarFillTop : ''}`} style={{ width: `${l.pct}%` }} />
              </div>
              <span className={styles.lbCount}>{l.count}</span>
            </Link>
          ))}
        </div>
      </div>

      <div className={styles.membersHeading}>
        Team Members <span className={styles.membersHeadingSub}>— click a card to open the sheet</span>
      </div>
      <div className={styles.cardsGrid}>
        {empCards.map((c) => {
          const color = employeeColor(c.colorIndex);
          const segPct = (n: number) => (c.total ? (n / c.total) * 100 : 0);
          return (
            <Link key={c.id} href={`/${cluster}/employee/${c.id}`} className={`${styles.card} ${styles.empCard}`}>
              <div className={styles.empCardTop}>
                <div className={styles.avatar} style={avatarStyle(38, color)}>
                  {c.initial}
                </div>
                <div style={{ flex: 1 }}>
                  <div className={styles.empCardName}>{c.name}</div>
                  <div className={styles.empCardTotal}>{c.total} tasks</div>
                </div>
                <div className={styles.empCardPct}>{c.completionPct}%</div>
              </div>
              <div className={styles.empCardBar}>
                <div style={{ width: `${segPct(c.done)}%`, background: '#16a34a' }} />
                <div style={{ width: `${segPct(c.ongoing)}%`, background: '#3b82f6' }} />
                <div style={{ width: `${segPct(c.pending)}%`, background: '#f59e0b' }} />
              </div>
              <div className={styles.empCardStats}>
                <span>
                  <b style={{ color: '#16a34a' }}>{c.done}</b> done
                </span>
                <span>
                  <b style={{ color: '#3b82f6' }}>{c.ongoing}</b> ongoing
                </span>
                <span>
                  <b style={{ color: '#f59e0b' }}>{c.pending}</b> pending
                </span>
              </div>
            </Link>
          );
        })}
      </div>

      <div className={styles.card} style={{ overflow: 'hidden' }}>
        <div className={styles.blockersHeader}>
          <div className={styles.sectionTitleTight} style={{ marginBottom: 0 }}>
            Help Needed — Open Blockers
          </div>
          <div className={styles.blockersHint}>Help jumps to the task</div>
        </div>
        {blockers.length === 0 && <div className={styles.blockersEmpty}>No blockers reported. 🎉</div>}
        {blockers.map(({ task, dateLabel, daysLabel, aging }) => (
          <BlockerRow
            key={task.id}
            task={task}
            cluster={cluster}
            dateLabel={dateLabel}
            daysLabel={daysLabel}
            aging={aging}
            avatarStyle={avatarStyle(26, employeeColor(task.empIndex))}
          />
        ))}
      </div>
    </div>
  );
}
