'use client';

import { useEffect, useState, useTransition } from 'react';
import { createPortal } from 'react-dom';
import { addTaskAction } from '@/lib/actions';
import { todayISO } from '@/lib/dates';
import { STATUS_META } from '@/lib/colors';
import type { Status } from '@/lib/types';
import styles from '@/app/[cluster]/employee/[id]/employee.module.css';

const EMPTY_FORM = {
  taskGeneral: '',
  taskDetails: '',
  date: todayISO(),
  dueDate: '',
  status: 'Pending' as Status,
  helpNeeded: '',
};

export default function AddDeliverableButton({
  employeeId,
  className,
  children,
}: {
  employeeId: string;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') close();
    }
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, [open]);

  function openModal() {
    setForm({ ...EMPTY_FORM, date: todayISO() });
    setError('');
    setOpen(true);
  }

  function close() {
    setOpen(false);
  }

  function updateField<K extends keyof typeof form>(field: K, value: (typeof form)[K]) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function submit() {
    const taskGeneral = form.taskGeneral.trim();
    if (!taskGeneral) {
      setError('Please describe the deliverable.');
      return;
    }
    startTransition(async () => {
      const result = await addTaskAction(employeeId, form.date || null, taskGeneral, {
        dueDate: form.dueDate || null,
        taskDetails: form.taskDetails,
        status: form.status,
        helpNeeded: form.helpNeeded,
      });
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setOpen(false);
    });
  }

  return (
    <>
      <button className={className} onClick={openModal}>
        {children}
      </button>
      {open &&
        createPortal(
          <div className={styles.addModalOverlay} onClick={close}>
            <div className={styles.addModalCard} onClick={(e) => e.stopPropagation()}>
              <div className={styles.addModalHeader}>
                <div className={styles.addModalTitle}>Add Deliverable</div>
                <button type="button" className={styles.addModalClose} onClick={close} aria-label="Close">
                  ×
                </button>
              </div>
              <div className={styles.addModalBody}>
                <div className={styles.addModalField}>
                  <label className={styles.addModalLabel}>Deliverable *</label>
                  <input
                    autoFocus
                    value={form.taskGeneral}
                    onChange={(e) => updateField('taskGeneral', e.target.value)}
                    placeholder="e.g. 1601C Filing - June"
                    className={styles.addModalInput}
                    disabled={pending}
                  />
                </div>
                <div className={styles.addModalField}>
                  <label className={styles.addModalLabel}>Details</label>
                  <textarea
                    value={form.taskDetails}
                    onChange={(e) => updateField('taskDetails', e.target.value)}
                    placeholder="Add specifics, one per line (optional)"
                    rows={3}
                    className={styles.addModalTextarea}
                    disabled={pending}
                  />
                </div>
                <div className={styles.addModalRow}>
                  <div className={styles.addModalField}>
                    <label className={styles.addModalLabel}>Date Created</label>
                    <input
                      type="date"
                      value={form.date}
                      onChange={(e) => updateField('date', e.target.value)}
                      className={styles.addModalInput}
                      disabled={pending}
                    />
                  </div>
                  <div className={styles.addModalField}>
                    <label className={styles.addModalLabel}>Due Date</label>
                    <input
                      type="date"
                      value={form.dueDate}
                      onChange={(e) => updateField('dueDate', e.target.value)}
                      className={styles.addModalInput}
                      disabled={pending}
                    />
                  </div>
                </div>
                <div className={styles.addModalField}>
                  <label className={styles.addModalLabel}>Status</label>
                  <select
                    value={form.status}
                    onChange={(e) => updateField('status', e.target.value as Status)}
                    className={styles.addModalSelect}
                    style={{ background: STATUS_META[form.status].bg, color: STATUS_META[form.status].color }}
                    disabled={pending}
                  >
                    <option value="Pending">Pending</option>
                    <option value="Ongoing">Ongoing</option>
                    <option value="Done">Done</option>
                  </select>
                </div>
                <div className={styles.addModalField}>
                  <label className={styles.addModalLabel}>Help Needed</label>
                  <textarea
                    value={form.helpNeeded}
                    onChange={(e) => updateField('helpNeeded', e.target.value)}
                    placeholder="Any roadblocks? (optional)"
                    rows={2}
                    className={styles.addModalTextarea}
                    disabled={pending}
                  />
                </div>
                {error && <div className={styles.addModalError}>{error}</div>}
              </div>
              <div className={styles.addModalFooter}>
                <button type="button" className={styles.addModalCancelBtn} onClick={close} disabled={pending}>
                  Cancel
                </button>
                <button type="button" className={styles.addModalSubmitBtn} onClick={submit} disabled={pending}>
                  {pending ? 'Adding…' : 'Add Deliverable'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
