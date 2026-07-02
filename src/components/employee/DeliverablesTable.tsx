'use client';

import { useEffect, useRef, useState } from 'react';
import type { TaskDTO } from '@/lib/types';
import { MONFULL, WEEKSHORT, addDays, daysInMonth, firstWeekdayOfMonth, fmtShort, isoToParts, mondayOf } from '@/lib/dates';
import StickyOffsetMeasurer from '@/components/StickyOffsetMeasurer';
import AddDeliverableButton from './AddDeliverableButton';
import DeliverableRow from './DeliverableRow';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function DeliverablesTable({
  employeeId,
  tasks,
  todayIso,
  highlightTaskId,
  canEdit,
}: {
  employeeId: string;
  tasks: TaskDTO[];
  todayIso: string;
  highlightTaskId: string | null;
  canEdit: boolean;
}) {
  const thisMonday = mondayOf(todayIso);
  const [weekStart, setWeekStart] = useState(thisMonday);
  const [weekEnd, setWeekEnd] = useState(addDays(thisMonday, 4));
  const [panel, setPanel] = useState<'none' | 'menu' | 'picker'>('none');
  const [pendingStart, setPendingStart] = useState<string | null>(null);
  const [showAll, setShowAll] = useState(false);
  const initialParts = isoToParts(todayIso);
  const [pickerYear, setPickerYear] = useState(initialParts.y);
  const [pickerMonth, setPickerMonth] = useState(initialParts.m - 1);
  const panelRef = useRef<HTMLDivElement>(null);

  const isCurrentWeek = weekStart === thisMonday && weekEnd === addDays(thisMonday, 4);
  const visibleTasks = showAll ? tasks : tasks.filter((t) => !t.date || (t.date >= weekStart && t.date <= weekEnd));

  function setRange(start: string, end: string) {
    setShowAll(false);
    setWeekStart(start);
    setWeekEnd(end);
  }

  useEffect(() => {
    if (highlightTaskId == null) return;
    const target = tasks.find((t) => t.id === highlightTaskId);
    if (target?.date && (target.date < weekStart || target.date > weekEnd)) {
      const monday = mondayOf(target.date);
      setRange(monday, addDays(monday, 4));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [highlightTaskId]);

  useEffect(() => {
    if (panel === 'none') return;
    function onOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setPanel('none');
        setPendingStart(null);
      }
    }
    document.addEventListener('mousedown', onOutside);
    return () => document.removeEventListener('mousedown', onOutside);
  }, [panel]);

  function openPicker() {
    const parts = isoToParts(weekEnd);
    setPickerYear(parts.y);
    setPickerMonth(parts.m - 1);
    setPendingStart(null);
    setPanel('picker');
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

  function onDayClick(iso: string) {
    if (pendingStart == null) {
      setPendingStart(iso);
      return;
    }
    const from = pendingStart < iso ? pendingStart : iso;
    const to = pendingStart < iso ? iso : pendingStart;
    setRange(from, to);
    setPendingStart(null);
    setPanel('none');
  }

  const dim = daysInMonth(pickerYear, pickerMonth);
  const first = firstWeekdayOfMonth(pickerYear, pickerMonth);
  const days: { label: string; iso: string }[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push({ label: String(d), iso: `${pickerYear}-${pad(pickerMonth + 1)}-${pad(d)}` });
  }

  return (
    <div className={styles.tableCard}>
      <StickyOffsetMeasurer className={styles.tableToolbar} cssVar="--toolbar-offset">
        <span className={styles.tableToolbarLabel}>
          {showAll
            ? 'Showing all deliverables'
            : isCurrentWeek
              ? `Showing this week (${fmtShort(weekStart)} – ${fmtShort(weekEnd)})`
              : `Showing ${fmtShort(weekStart)} – ${fmtShort(weekEnd)}`}
        </span>
        <div className={styles.tableToolbarActions}>
          <div style={{ position: 'relative' }}>
            <button
              type="button"
              className={styles.weekMenuBtn}
              onClick={() => setPanel((p) => (p === 'menu' ? 'none' : 'menu'))}
            >
              View weeks <span className={styles.weekMenuChevron}>▾</span>
            </button>
            {panel === 'menu' && (
              <div ref={panelRef} className={`${styles.popover} ${styles.weekMenuPopover}`}>
                <button
                  type="button"
                  className={`${styles.weekMenuItem} ${isCurrentWeek && !showAll ? styles.weekMenuItemActive : ''}`}
                  onClick={() => {
                    setRange(thisMonday, addDays(thisMonday, 4));
                    setPanel('none');
                  }}
                >
                  This week
                </button>
                <button
                  type="button"
                  className={styles.weekMenuItem}
                  onClick={() => {
                    setRange(addDays(weekStart, -7), addDays(weekStart, -3));
                    setPanel('none');
                  }}
                >
                  View previous week
                </button>
                <button
                  type="button"
                  className={styles.weekMenuItem}
                  onClick={() => {
                    setRange(addDays(weekStart, 7), addDays(weekStart, 11));
                    setPanel('none');
                  }}
                >
                  View upcoming week
                </button>
                <button type="button" className={styles.weekMenuItem} onClick={openPicker}>
                  View custom date…
                </button>
                <button
                  type="button"
                  className={styles.weekMenuItem}
                  onClick={() => {
                    setShowAll(true);
                    setPanel('none');
                  }}
                >
                  View all
                </button>
              </div>
            )}
            {panel === 'picker' && (
              <div ref={panelRef} className={`${styles.popover} ${styles.pickerPopover}`} style={{ top: 36, right: 0, left: 'auto' }}>
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
                <div className={styles.pickerHint}>
                  {pendingStart ? `From ${fmtShort(pendingStart)} — pick an end date` : 'Pick a start date, then an end date'}
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
                    const isPendingStart = pendingStart === day.iso;
                    const inAppliedRange = !pendingStart && day.iso >= weekStart && day.iso <= weekEnd;
                    const isToday = day.iso === todayIso;
                    return (
                      <div
                        key={day.iso}
                        className={`${styles.pickerDay} ${inAppliedRange || isPendingStart ? styles.pickerDaySelected : ''} ${!inAppliedRange && !isPendingStart && isToday ? styles.pickerDayToday : ''}`}
                        onClick={() => onDayClick(day.iso)}
                      >
                        {day.label}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </StickyOffsetMeasurer>
      <div className={styles.tableScroll}>
        <table className={styles.table}>
          <colgroup>
            <col style={{ width: '9%' }} />
            <col style={{ width: '9%' }} />
            <col style={{ width: '35%' }} />
            <col style={{ width: '10%' }} />
            <col style={{ width: '34%' }} />
            <col style={{ width: '3%' }} />
          </colgroup>
          <thead>
            <tr className={styles.theadRow}>
              <th className={`${styles.th} ${styles.thRight}`}>Created</th>
              <th className={`${styles.th} ${styles.thRight}`}>Due Date</th>
              <th className={styles.th}>Deliverables</th>
              <th className={styles.th}>Status</th>
              <th className={styles.th}>Help Needed</th>
              <th className={styles.th}></th>
            </tr>
          </thead>
          <tbody>
            {visibleTasks.map((task) => (
              <DeliverableRow
                key={task.id}
                task={task}
                todayIso={todayIso}
                highlighted={task.id === highlightTaskId}
                canEdit={canEdit}
              />
            ))}
          </tbody>
        </table>
      </div>
      {canEdit && (
        <AddDeliverableButton employeeId={employeeId} className={styles.addRow}>
          + Add deliverable
        </AddDeliverableButton>
      )}
    </div>
  );
}
