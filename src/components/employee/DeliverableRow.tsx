'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { deleteTaskAction, updateTaskAction } from '@/lib/actions';
import { MON, MONFULL, WEEKSHORT, daysInMonth, firstWeekdayOfMonth, isTaskLocked, isoToParts, todayISO } from '@/lib/dates';
import { STATUS_META } from '@/lib/colors';
import type { Status, TaskDTO } from '@/lib/types';
import TaskDetailsCell from './TaskDetailsCell';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function DeliverableRow({
  task,
  todayIso,
  highlighted,
  canEdit,
}: {
  task: TaskDTO;
  todayIso: string;
  highlighted: boolean;
  canEdit: boolean;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerField, setPickerField] = useState<'date' | 'dueDate'>('date');
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const initialParts = task.date ? isoToParts(task.date) : isoToParts(todayIso);
  const [pickerYear, setPickerYear] = useState(initialParts.y);
  const [pickerMonth, setPickerMonth] = useState(initialParts.m - 1);
  const [status, setStatus] = useState<Status>(task.status);
  const [clientToday, setClientToday] = useState(todayIso);

  useEffect(() => {
    function syncToday() {
      setClientToday(todayISO());
    }
    syncToday();
    const interval = setInterval(syncToday, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (highlighted && rowRef.current) {
      rowRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [highlighted]);

  useEffect(() => {
    if (!pickerOpen) return;
    function onOutside(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setPickerOpen(false);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [pickerOpen]);

  function openPicker(field: 'date' | 'dueDate', anchor: HTMLElement) {
    if (lockedForFields) return;
    const current = field === 'date' ? task.date : task.dueDate;
    const parts = current ? isoToParts(current) : isoToParts(clientToday);
    setPickerYear(parts.y);
    setPickerMonth(parts.m - 1);
    setPickerField(field);
    const rect = anchor.getBoundingClientRect();
    const popoverWidth = 228;
    const left = Math.min(rect.left, window.innerWidth - popoverWidth - 8);
    setPopoverPos({ top: rect.bottom + 6, left: Math.max(8, left) });
    setPickerOpen(true);
  }

  function stepMonth(delta: number) {
    let m = pickerMonth + delta;
    let y = pickerYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setPickerMonth(m);
    setPickerYear(y);
  }

  function pickDate(iso: string) {
    setPickerOpen(false);
    if (pickerField === 'date') {
      updateTaskAction(task.id, { date: iso });
    } else {
      updateTaskAction(task.id, { dueDate: iso });
    }
  }

  function onStatusChange(value: Status) {
    if (!canEdit) return;
    if (aged) {
      const confirmed = window.confirm(
        "This task is more than 2 weeks old. Make sure you've informed your direct supervisor about why it's still open before changing its status. Continue?"
      );
      if (!confirmed) return;
    }
    setStatus(value);
    updateTaskAction(task.id, { status: value });
  }

  const aged = isTaskLocked(task.date, clientToday);
  // Permission-locked rows are fully view-only; aged-but-permitted rows still allow status/help-needed.
  const lockedForFields = !canEdit || aged;
  const statusAndHelpLocked = !canEdit;
  const sm = STATUS_META[status];
  const dim = daysInMonth(pickerYear, pickerMonth);
  const first = firstWeekdayOfMonth(pickerYear, pickerMonth);
  const days: { label: string; iso: string }[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push({ label: String(d), iso: `${pickerYear}-${pad(pickerMonth + 1)}-${pad(d)}` });
  }

  function renderPicker(activeValue: string | null) {
    if (!popoverPos) return null;
    return createPortal(
      <div
        ref={popoverRef}
        className={`${styles.popover} ${styles.pickerPopover}`}
        style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left, right: 'auto' }}
      >
        <div className={styles.pickerHeader}>
          <div className={styles.pickerNavBtn} onClick={() => stepMonth(-1)}>
            ‹
          </div>
          <div className={styles.pickerMonthLabel}>
            {MONFULL[pickerMonth]} {pickerYear}
          </div>
          <div className={styles.pickerNavBtn} onClick={() => stepMonth(1)}>
            ›
          </div>
        </div>
        <div className={styles.pickerWeekdays}>
          {WEEKSHORT.map((wd) => (
            <div key={wd} className={styles.pickerWeekday}>
              {wd}
            </div>
          ))}
        </div>
        <div className={styles.pickerDays}>
          {Array.from({ length: first }).map((_, i) => (
            <div key={`pad-${i}`} />
          ))}
          {days.map((day) => {
            const isSel = day.iso === activeValue;
            const isToday = day.iso === clientToday;
            return (
              <div
                key={day.iso}
                className={`${styles.pickerDay} ${isSel ? styles.pickerDaySelected : ''} ${!isSel && isToday ? styles.pickerDayToday : ''}`}
                onClick={() => pickDate(day.iso)}
              >
                {day.label}
              </div>
            );
          })}
        </div>
      </div>,
      document.body
    );
  }

  return (
    <tr ref={rowRef} className={`${styles.row} ${highlighted ? styles.rowHighlight : ''}`}>
      <td className={styles.td}>
        <div
          className={`${styles.dateBtn} ${lockedForFields ? styles.dateBtnLocked : ''}`}
          onClick={(e) => openPicker('date', e.currentTarget)}
        >
          <span style={{ fontSize: 12 }}>{lockedForFields ? '🔒' : '📅'}</span>
          {task.date ? (
            <span className={styles.dateBtnLabel}>
              {MON[isoToParts(task.date).m - 1]} {isoToParts(task.date).d}
            </span>
          ) : (
            <span className={styles.dateBtnPlaceholder}>Pick date</span>
          )}
        </div>
        {pickerOpen && pickerField === 'date' && renderPicker(task.date)}
      </td>
      <td className={styles.tdText}>
        <input
          key={`g-${task.id}`}
          defaultValue={task.taskGeneral}
          onBlur={(e) => updateTaskAction(task.id, { taskGeneral: e.target.value })}
          placeholder="Task (general)"
          className={styles.taskGeneralInput}
          readOnly={lockedForFields}
        />
        <TaskDetailsCell key={`d-${task.id}`} taskId={task.id} initialValue={task.taskDetails} readOnly={lockedForFields} />
      </td>
      <td className={styles.td}>
        <div
          className={`${styles.dateBtn} ${lockedForFields ? styles.dateBtnLocked : ''}`}
          onClick={(e) => openPicker('dueDate', e.currentTarget)}
        >
          <span style={{ fontSize: 12 }}>{lockedForFields ? '🔒' : '📅'}</span>
          {task.dueDate ? (
            <span className={styles.dateBtnLabel}>
              {MON[isoToParts(task.dueDate).m - 1]} {isoToParts(task.dueDate).d}
            </span>
          ) : (
            <span className={styles.dateBtnPlaceholder}>Set due date</span>
          )}
        </div>
        {pickerOpen && pickerField === 'dueDate' && renderPicker(task.dueDate)}
      </td>
      <td className={styles.td}>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as Status)}
          className={styles.statusSelect}
          style={{ background: sm.bg, color: sm.color }}
          disabled={statusAndHelpLocked}
        >
          <option value="Pending">Pending</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Done">Done</option>
        </select>
        {aged && canEdit && (
          <div className={styles.agedNotice}>⚠ 2+ weeks old — inform your supervisor before changing status</div>
        )}
      </td>
      <td className={styles.tdText}>
        <textarea
          key={`h-${task.id}`}
          defaultValue={task.helpNeeded}
          onBlur={(e) => updateTaskAction(task.id, { helpNeeded: e.target.value })}
          placeholder="Any roadblocks?"
          rows={2}
          className={styles.helpTextarea}
          readOnly={statusAndHelpLocked}
        />
      </td>
      <td className={styles.tdCenter}>
        {!canEdit ? (
          <span className={styles.lockedIcon} title="View only — you can only edit your own deliverables">
            🔒
          </span>
        ) : aged ? (
          <span className={styles.lockedIcon} title="More than 2 weeks old — date and text can no longer be edited or deleted">
            🔒
          </span>
        ) : (
          <button className={styles.deleteBtn} onClick={() => deleteTaskAction(task.id)}>
            ×
          </button>
        )}
      </td>
    </tr>
  );
}
