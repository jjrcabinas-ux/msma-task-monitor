'use client';

import { useState } from 'react';
import { updateTaskAction } from '@/lib/actions';
import styles from '@/app/employee/[id]/employee.module.css';

export default function TaskDetailsCell({ taskId, initialValue }: { taskId: string; initialValue: string }) {
  const [value, setValue] = useState(initialValue);
  const [editing, setEditing] = useState(false);
  const [expanded, setExpanded] = useState(false);

  const lines = value.split('\n').filter((l) => l.trim());

  function save(next: string) {
    setValue(next);
    setEditing(false);
    updateTaskAction(taskId, { taskDetails: next });
  }

  if (editing) {
    return (
      <textarea
        autoFocus
        defaultValue={value}
        onBlur={(e) => save(e.target.value)}
        placeholder="Details (specific) — press Enter to add another bullet"
        rows={Math.max(2, lines.length)}
        className={styles.taskDetailsTextarea}
      />
    );
  }

  if (lines.length === 0) {
    return (
      <div className={styles.taskDetailsPlaceholder} onClick={() => setEditing(true)}>
        Details (specific)
      </div>
    );
  }

  const visibleLines = expanded ? lines : lines.slice(0, 1);

  return (
    <div onClick={() => setEditing(true)}>
      {visibleLines.map((line, i) => (
        <div key={i} className={styles.taskDetailsBullet}>
          {lines.length > 1 ? '• ' : ''}
          {line}
        </div>
      ))}
      {lines.length > 1 && (
        <span
          className={styles.seeMoreLink}
          onClick={(e) => {
            e.stopPropagation();
            setExpanded((v) => !v);
          }}
        >
          {expanded ? 'see less' : 'see more'}
        </span>
      )}
    </div>
  );
}
