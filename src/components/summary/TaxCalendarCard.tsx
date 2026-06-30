'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition } from 'react';
import { addTaskAction } from '@/lib/actions';
import { birFilingsForDate, birFilingsForMonth, type BirFiling } from '@/lib/birCalendar';
import type { ClusterSlug } from '@/lib/clusters';
import { MONFULL, WEEKSHORT, addDays, daysInMonth, firstWeekdayOfMonth, isoToParts, todayISO } from '@/lib/dates';
import styles from '@/app/[cluster]/summary.module.css';

const pad = (n: number) => (n < 10 ? `0${n}` : String(n));

export default function TaxCalendarCard({
  cluster,
  roster,
  todayIso,
}: {
  cluster: ClusterSlug;
  roster: { id: string; name: string }[];
  todayIso: string;
}) {
  const router = useRouter();
  const initial = isoToParts(todayIso);
  const [viewYear, setViewYear] = useState(initial.y);
  const [viewMonth, setViewMonth] = useState(initial.m - 1);
  const [clientToday, setClientToday] = useState(todayIso);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [expandedFilingId, setExpandedFilingId] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    function syncToday() {
      setClientToday(todayISO());
    }
    syncToday();
    const interval = setInterval(syncToday, 60000);
    return () => clearInterval(interval);
  }, []);

  function stepMonth(delta: number) {
    let m = viewMonth + delta;
    let y = viewYear;
    if (m < 0) {
      m = 11;
      y -= 1;
    } else if (m > 11) {
      m = 0;
      y += 1;
    }
    setViewMonth(m);
    setViewYear(y);
  }

  const filings = birFilingsForMonth(viewYear, viewMonth);
  const filingsByDay = new Map<number, BirFiling[]>();
  for (const f of filings) {
    const d = isoToParts(f.dueDate).d;
    filingsByDay.set(d, [...(filingsByDay.get(d) || []), f]);
  }

  const dim = daysInMonth(viewYear, viewMonth);
  const first = firstWeekdayOfMonth(viewYear, viewMonth);
  const days: { day: number; iso: string }[] = [];
  for (let d = 1; d <= dim; d++) {
    days.push({ day: d, iso: `${viewYear}-${pad(viewMonth + 1)}-${pad(d)}` });
  }

  const selectedFilings = selectedDate ? filingsByDay.get(isoToParts(selectedDate).d) || [] : [];
  const todayFilings = birFilingsForDate(clientToday);
  const tomorrowFilings = birFilingsForDate(addDays(clientToday, 1));

  function openDay(iso: string, marked: boolean) {
    if (!marked) return;
    setExpandedFilingId(null);
    setSelectedDate(iso);
  }

  function assign(filing: BirFiling, employeeId: string) {
    setSelectedDate(null);
    setExpandedFilingId(null);
    startTransition(async () => {
      const taskGeneral = `${filing.code} — ${filing.label} (${filing.periodLabel})`;
      const result = await addTaskAction(employeeId, filing.dueDate, taskGeneral);
      if ('error' in result) return;
      router.push(`/${cluster}/employee/${employeeId}?highlight=${result.id}`);
    });
  }

  function renderFiling(f: BirFiling) {
    return (
      <div key={f.id}>
        <button
          type="button"
          className={styles.birCalFilingRow}
          onClick={() => setExpandedFilingId(expandedFilingId === f.id ? null : f.id)}
          disabled={pending}
        >
          <span className={styles.taxCalCode}>{f.code}</span>
          <div className={styles.birCalFilingBody}>
            <div className={styles.taxCalLabel}>{f.label}</div>
            <div className={styles.taxCalPeriod}>{f.periodLabel}</div>
          </div>
        </button>
        {expandedFilingId === f.id && (
          <div className={styles.birCalEmployeeList}>
            <div className={styles.taxCalPopoverTitle}>Add task for</div>
            {roster.map((r) => (
              <div key={r.id} className={styles.taxCalPopoverRow} onClick={() => assign(f, r.id)}>
                {r.name}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className={`${styles.card} ${styles.cardPad}`}>
      <div className={styles.sectionTitleTight}>Tax Calendar (BIR)</div>
      <div className={styles.taxCalSub}>Click a marked date to see what&rsquo;s due</div>

      <div className={styles.birCalHeader}>
        <div className={styles.birCalNavBtn} onClick={() => stepMonth(-1)}>
          ‹
        </div>
        <div className={styles.birCalMonthLabel}>
          {MONFULL[viewMonth]} {viewYear}
        </div>
        <div className={styles.birCalNavBtn} onClick={() => stepMonth(1)}>
          ›
        </div>
      </div>

      <div className={styles.birCalWeekdays}>
        {WEEKSHORT.map((wd) => (
          <div key={wd} className={styles.birCalWeekday}>
            {wd}
          </div>
        ))}
      </div>

      <div className={styles.birCalDays}>
        {Array.from({ length: first }).map((_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map(({ day, iso }) => {
          const marked = filingsByDay.has(day);
          const isToday = iso === clientToday;
          return (
            <div
              key={iso}
              className={`${styles.birCalDay} ${marked ? styles.birCalDayMarked : ''} ${isToday ? styles.birCalDayToday : ''}`}
              onClick={() => openDay(iso, marked)}
            >
              {day}
              {marked && <span className={styles.birCalDot} />}
            </div>
          );
        })}
      </div>

      <div className={styles.dueTodayWrap}>
        <div className={`${styles.dueTodayHeading} ${styles.dueTodayHeadingHot}`}>
          Due Today
          {todayFilings.length > 0 && <span className={styles.dueTodayCount}>{todayFilings.length}</span>}
        </div>
        {todayFilings.length === 0 ? (
          <div className={styles.emptyNote}>Nothing due today.</div>
        ) : (
          todayFilings.map(renderFiling)
        )}
      </div>

      <div className={styles.dueTodayWrap}>
        <div className={styles.dueTodayHeading}>
          Upcoming — Tomorrow
          {tomorrowFilings.length > 0 && <span className={styles.dueTodayCount}>{tomorrowFilings.length}</span>}
        </div>
        {tomorrowFilings.length === 0 ? (
          <div className={styles.emptyNote}>Nothing due tomorrow.</div>
        ) : (
          tomorrowFilings.map(renderFiling)
        )}
      </div>

      {selectedDate && (
        <div className={styles.birCalOverlay} onClick={() => setSelectedDate(null)}>
          <div className={styles.birCalModal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.birCalModalHeader}>
              <div className={styles.birCalModalTitle}>{MONFULL[isoToParts(selectedDate).m - 1]} {isoToParts(selectedDate).d}, {isoToParts(selectedDate).y}</div>
              <button type="button" className={styles.birCalModalClose} onClick={() => setSelectedDate(null)}>
                ×
              </button>
            </div>
            <div className={styles.birCalModalBody}>{selectedFilings.map(renderFiling)}</div>
          </div>
        </div>
      )}
    </div>
  );
}
