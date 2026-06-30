'use client';

import { useState } from 'react';
import { updateTaskAction } from '@/lib/actions';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

export default function HelpNeededCell({
  taskId,
  initialValue,
  readOnly = false,
}: {
  taskId: string;
  initialValue: string;
  readOnly?: boolean;
}) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);

  function save(next: string) {
    setValue(next);
    setEditing(false);
    updateTaskAction(taskId, { helpNeeded: next });
  }

  if (editing && !readOnly) {
    return (
      <textarea
        autoFocus
        defaultValue={value}
        onBlur={(e) => save(e.target.value)}
        placeholder="Any roadblocks?"
        rows={2}
        className={styles.helpTextarea}
      />
    );
  }

  if (!value.trim()) {
    return (
      <div
        className={styles.helpPlaceholder}
        onClick={() => !readOnly && setEditing(true)}
        style={readOnly ? { cursor: 'default' } : undefined}
      >
        {readOnly ? '—' : 'Any roadblocks?'}
      </div>
    );
  }

  return (
    <div className={styles.helpText} onClick={() => !readOnly && setEditing(true)} style={readOnly ? { cursor: 'default' } : undefined}>
      {value}
    </div>
  );
}
