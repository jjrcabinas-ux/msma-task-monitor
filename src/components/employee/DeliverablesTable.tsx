'use client';

import { useState } from 'react';
import type { TaskDTO } from '@/lib/types';
import { addDays, fmtShort } from '@/lib/dates';
import AddDeliverableButton from './AddDeliverableButton';
import DeliverableRow from './DeliverableRow';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

export default function DeliverablesTable({
  employeeId,
  tasks,
  todayIso,
  highlightTaskId,
}: {
  employeeId: string;
  tasks: TaskDTO[];
  todayIso: string;
  highlightTaskId: string | null;
}) {
  const weekStart = addDays(todayIso, -6);
  const highlightIsOlder = highlightTaskId != null && tasks.some((t) => t.id === highlightTaskId && t.date && t.date < weekStart);
  const [showAll, setShowAll] = useState(highlightIsOlder);
  const olderCount = tasks.filter((t) => t.date && t.date < weekStart).length;
  const visibleTasks = showAll ? tasks : tasks.filter((t) => !t.date || t.date >= weekStart);

  return (
    <div className={styles.tableCard}>
      {olderCount > 0 && (
        <div className={styles.tableToolbar}>
          <span className={styles.tableToolbarLabel}>
            {showAll ? 'Showing all deliverables' : `Showing this week (since ${fmtShort(weekStart)})`}
          </span>
          <button type="button" className={styles.seeMoreLink} onClick={() => setShowAll((v) => !v)}>
            {showAll ? 'Hide previous weeks' : `View previous weeks (${olderCount})`}
          </button>
        </div>
      )}
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: 118 }} />
            <col />
            <col style={{ width: 118 }} />
            <col style={{ width: 188 }} />
            <col style={{ width: 40 }} />
          </colgroup>
          <thead>
            <tr className={styles.theadRow}>
              <th className={styles.th}>Date</th>
              <th className={styles.th}>Deliverables</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Help Needed</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((task) => (
              <DeliverableRow key={task.id} task={task} todayIso={todayIso} highlighted={task.id === highlightTaskId} />
            ))}
          </tbody>
        </table>
      </div>
      <AddDeliverableButton employeeId={employeeId} className={styles.addRow}>
        + Add deliverable
      </AddDeliverableButton>
    </div>
  );
}
