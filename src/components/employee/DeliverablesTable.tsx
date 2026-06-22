import { accomplishmentsForDate } from '@/lib/analytics';
import type { TaskDTO } from '@/lib/types';
import AddDeliverableButton from './AddDeliverableButton';
import DeliverableRow from './DeliverableRow';
import styles from '@/app/employee/[id]/employee.module.css';

export default function DeliverablesTable({
  employeeId,
  tasks,
  showAccomp,
  todayIso,
  highlightTaskId,
}: {
  employeeId: string;
  tasks: TaskDTO[];
  showAccomp: boolean;
  todayIso: string;
  highlightTaskId: string | null;
}) {
  return (
    <div className={styles.tableCard}>
      <table className={styles.table}>
        <colgroup>
          <col style={{ width: 118 }} />
          <col />
          <col style={{ width: 118 }} />
          {showAccomp && <col style={{ width: 168 }} />}
          <col style={{ width: 188 }} />
          <col style={{ width: 40 }} />
        </colgroup>
        <thead>
          <tr className={styles.theadRow}>
            <th className={styles.th}>Date</th>
            <th className={styles.th}>Deliverables</th>
            <th className={styles.th}>Status</th>
            {showAccomp && <th className={styles.th}>Accomplishments</th>}
            <th className={styles.th}>Help Needed</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <DeliverableRow
              key={task.id}
              task={task}
              accomplishments={accomplishmentsForDate(tasks, task.date)}
              showAccomp={showAccomp}
              todayIso={todayIso}
              highlighted={task.id === highlightTaskId}
            />
          ))}
        </tbody>
      </table>
      <AddDeliverableButton employeeId={employeeId} className={styles.addRow}>
        + Add deliverable
      </AddDeliverableButton>
    </div>
  );
}
