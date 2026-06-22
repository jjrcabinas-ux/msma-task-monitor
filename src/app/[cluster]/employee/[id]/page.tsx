import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getEmployeeWithTasks, getRoster } from '@/lib/data';
import { isClusterSlug } from '@/lib/clusters';
import { todayISO } from '@/lib/dates';
import { statusCounts, displayName } from '@/lib/analytics';
import { employeeColor } from '@/lib/colors';
import RemoveMemberControl from '@/components/employee/RemoveMemberControl';
import AddDeliverableButton from '@/components/employee/AddDeliverableButton';
import DeliverablesTable from '@/components/employee/DeliverablesTable';
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

  const roster = await getRoster(cluster);
  const colorIndex = roster.findIndex((e) => e.id === id);
  const canRemove = roster.length > 1;

  const counts = statusCounts(tasks);
  const total = tasks.length;
  const completionPct = total ? Math.round((counts.Done / total) * 100) : 0;
  const seg = (n: number) => (total ? (n / total) * 100 : 0);
  const name = displayName(employee);

  return (
    <div className={styles.page}>
      <Link href={`/${cluster}`} className={styles.backLink}>
        ‹ Back to Team Summary
      </Link>

      <div className={styles.headerRow}>
        <div className={styles.identity}>
          <div className={styles.avatarBig} style={{ background: employeeColor(colorIndex) }}>
            {name[0]}
          </div>
          <div>
            <h1 className={styles.h1}>{name}</h1>
            <div className={styles.subRow}>
              {total} tasks · {completionPct}% complete
            </div>
          </div>
        </div>
        <div className={styles.actions}>
          {canRemove && <RemoveMemberControl employeeId={employee.id} cluster={cluster} name={name} />}
          <AddDeliverableButton employeeId={employee.id} className={styles.addBtn}>
            + Add Deliverable
          </AddDeliverableButton>
        </div>
      </div>

      <div className={styles.statsCard}>
        <div className={styles.statsBarWrap}>
          <div className={styles.statsBar}>
            <div style={{ width: `${seg(counts.Done)}%`, background: '#16a34a' }} />
            <div style={{ width: `${seg(counts.Ongoing)}%`, background: '#3b82f6' }} />
            <div style={{ width: `${seg(counts.Pending)}%`, background: '#f59e0b' }} />
          </div>
        </div>
        <div className={styles.statsNumbers}>
          <div>
            <div className={styles.statLabel}>Done</div>
            <div className={styles.statValue} style={{ color: '#16a34a' }}>
              {counts.Done}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>Ongoing</div>
            <div className={styles.statValue} style={{ color: '#3b82f6' }}>
              {counts.Ongoing}
            </div>
          </div>
          <div>
            <div className={styles.statLabel}>Pending</div>
            <div className={styles.statValue} style={{ color: '#f59e0b' }}>
              {counts.Pending}
            </div>
          </div>
        </div>
      </div>

      <DeliverablesTable
        employeeId={employee.id}
        tasks={tasks}
        todayIso={todayISO()}
        highlightTaskId={highlight || null}
      />
    </div>
  );
}
