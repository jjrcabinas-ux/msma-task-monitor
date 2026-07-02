import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmployeeWithTasks, getRosterWithTasks } from '@/lib/data';
import { isClusterSlug } from '@/lib/clusters';
import { todayISO } from '@/lib/dates';
import { statusCounts, displayName } from '@/lib/analytics';
import { employeeColor } from '@/lib/colors';
import { getMemberSession, isAdminUnlocked } from '@/lib/memberAuth';
import StickyOffsetMeasurer from '@/components/StickyOffsetMeasurer';
import RemoveMemberControl from '@/components/employee/RemoveMemberControl';
import AddDeliverableButton from '@/components/employee/AddDeliverableButton';
import AvatarUpload from '@/components/employee/AvatarUpload';
import DeliverablesTable from '@/components/employee/DeliverablesTable';
import StatsSummaryBar from '@/components/employee/StatsSummaryBar';
import styles from './employee.module.css';

export default async function EmployeePage({
  params,
  searchParams,
}: {
  params: Promise<{ cluster: string; id: string }>;
  searchParams: Promise<{ highlight?: string }>;
}) {
  const { cluster: clusterParam, id } = await params;
  if (!isClusterSlug(clusterParam)) notFound();
  const cluster = clusterParam;
  const { highlight } = await searchParams;

  const data = await getEmployeeWithTasks(id, cluster);
  if (!data) notFound();
  const { employee, tasks } = data;

  const roster = await getRosterWithTasks(cluster);
  const colorIndex = roster.findIndex((r) => r.employee.id === id);

  // Leaderboard rank: position by total completed tasks across the team
  const doneCounts = roster
    .map((r) => ({ id: r.employee.id, done: r.tasks.filter((t) => t.status === 'Done').length }))
    .sort((a, b) => b.done - a.done);
  const leaderboardRank = doneCounts.findIndex((r) => r.id === id) + 1;

  const isAdmin = await isAdminUnlocked(cluster);
  const session = await getMemberSession(cluster);
  const canEdit = isAdmin || session?.employeeId === employee.id;
  const canRemove = isAdmin && roster.length > 1;

  const counts = statusCounts(tasks);
  const total = tasks.length;
  const completionPct = total ? Math.round((counts.Done / total) * 100) : 0;
  const name = displayName(employee);

  return (
    <div className={styles.page}>
      <StickyOffsetMeasurer className={styles.stickyHeader}>
        <Link href={`/${cluster}`} className={styles.backLink}>
          ‹ Back to Team Summary
        </Link>

        <div className={styles.headerRow}>
          <div className={styles.identity}>
            <AvatarUpload
              employeeId={employee.id}
              initialPhoto={employee.photo ?? null}
              fallbackLetter={name[0]}
              fallbackColor={employeeColor(colorIndex)}
              canEdit={canEdit}
              size={84}
            />
            <div>
              <h1 className={styles.h1}>{name}</h1>
              <div className={styles.subRow}>
                <b>{total}</b> tasks · <b>{completionPct}%</b> completion rate · <b>#{leaderboardRank}</b> leaderboard
              </div>
            </div>
          </div>
          <div className={styles.actions}>
            {canRemove && <RemoveMemberControl employeeId={employee.id} cluster={cluster} name={name} />}
            {canEdit && (
              <AddDeliverableButton employeeId={employee.id} className={styles.addBtn}>
                + Add Deliverable
              </AddDeliverableButton>
            )}
          </div>
        </div>

        <div className={styles.statsCard}>
          <StatsSummaryBar tasks={tasks} cluster={cluster} employeeId={employee.id} counts={counts} />
        </div>
      </StickyOffsetMeasurer>

      <DeliverablesTable
        employeeId={employee.id}
        tasks={tasks}
        todayIso={todayISO()}
        highlightTaskId={highlight || null}
        canEdit={canEdit}
      />
    </div>
  );
}
