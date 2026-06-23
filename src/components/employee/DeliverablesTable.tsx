import type { TaskDTO } from '@/lib/types';
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
  return (
    <div className={styles.tableCard}>
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
            {tasks.map((task) => (
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
