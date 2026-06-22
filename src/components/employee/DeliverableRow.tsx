'use client';

import { useEffect, useRef, useState } from 'react';
import { deleteTaskAction, updateTaskAction } from '@/lib/actions';
import { MON, MONFULL, WEEKSHORT, daysInMonth, firstWeekdayOfMonth, isoToParts } from '@/lib/dates';
import { STATUS_META } from '@/lib/colors';
import type { Status, TaskDTO } from '@/lib/types';
import TaskDetailsCell from './TaskDetailsCell';
import styles from '@/app/employee/[id]/employee.module.css';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function DeliverableRow({
  task,
  todayIso,
  highlighted,
}: {
  task: TaskDTO;
  todayIso: string;
  highlighted: boolean;
}) {
  const rowRef = useRef<HTMLTableRowElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const initialParts = task.date ? isoToParts(task.date) : isoToParts(todayIso);
  const [pickerYear, setPickerYear] = useState(initialParts.y);
  const [pickerMonth, setPickerMonth] = useState(initialParts.m - 1);
  const [status, setStatus] = useState<Status>(task.status);

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

  function openPicker() {
    const parts = task.date ? isoToParts(task.date) : isoToParts(todayIso);
    setPickerYear(parts.y);
    setPickerMonth(parts.m - 1);
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
    updateTaskAction(task.id, { date: iso });
  }

  function onStatusChange(value: Status) {
    setStatus(value);
    updateTaskAction(task.id, { status: value });
  }

  const sm = STATUS_META[status];
  const dim = daysInMonth(pickerYear, pickerMonth);
  const first = firstWeekdayOfMonth(pickerYear, pickerMonth);
  const days: { label: string; iso: string }[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push({ label: String(d), iso: `${pickerYear}-${pad(pickerMonth + 1)}-${pad(d)}` });
  }

  return (
    <tr ref={rowRef} className={`${styles.row} ${highlighted ? styles.rowHighlight : ''}`}>
      <td className={styles.td}>
        <div className={styles.dateBtn} onClick={openPicker}>
          <span style={{ fontSize: 12 }}>📅</span>
          {task.date ? (
            <span className={styles.dateBtnLabel}>
              {MON[isoToParts(task.date).m - 1]} {isoToParts(task.date).d}
            </span>
          ) : (
            <span className={styles.dateBtnPlaceholder}>Pick date</span>
          )}
        </div>
        {pickerOpen && (
          <div ref={popoverRef} className={`${styles.popover} ${styles.pickerPopover}`}>
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
                const isSel = day.iso === task.date;
                const isToday = day.iso === todayIso;
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
          </div>
        )}
      </td>
      <td className={styles.tdText}>
        <input
          key={`g-${task.id}`}
          defaultValue={task.taskGeneral}
          onBlur={(e) => updateTaskAction(task.id, { taskGeneral: e.target.value })}
          placeholder="Task (general)"
          className={styles.taskGeneralInput}
        />
        <TaskDetailsCell key={`d-${task.id}`} taskId={task.id} initialValue={task.taskDetails} />
      </td>
      <td className={styles.td}>
        <select
          value={status}
          onChange={(e) => onStatusChange(e.target.value as Status)}
          className={styles.statusSelect}
          style={{ background: sm.bg, color: sm.color }}
        >
          <option value="Pending">Pending</option>
          <option value="Ongoing">Ongoing</option>
          <option value="Done">Done</option>
        </select>
      </td>
      <td className={styles.tdText}>
        <textarea
          key={`h-${task.id}`}
          defaultValue={task.helpNeeded}
          onBlur={(e) => updateTaskAction(task.id, { helpNeeded: e.target.value })}
          placeholder="Any roadblocks?"
          rows={2}
          className={styles.helpTextarea}
        />
      </td>
      <td className={styles.tdCenter}>
        <button className={styles.deleteBtn} onClick={() => deleteTaskAction(task.id)}>
          ×
        </button>
      </td>
    </tr>
  );
}
