'use client';

import { useState, useTransition, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { ClusterSlug } from '@/lib/clusters';
import {
  createEngagementAction,
  deleteEngagementAction,
  updateEngagementStatusAction,
  addEngagementTaskAction,
  updateEngagementTaskAction,
  deleteEngagementTaskAction,
} from '@/lib/engagementActions';
import styles from './engagement.module.css';

/* ── Types ─────────────────────────────────────────────────── */
type EngagementTask = {
  id: string;
  task: string;
  createdDate: Date;
  dueDate: Date | null;
  status: string;
  comments: string;
  sortOrder: number;
  assignedTo: string;
  linkedTaskId: string | null;
};

type Engagement = {
  id: string;
  cluster: string;
  companyName: string;
  engagement: string;
  proposalDate: Date;
  dueDate: Date;
  seniorAssigned: string;
  juniorAssigned: string[];
  status: string;
  createdAt: Date;
  tasks: EngagementTask[];
};

/* ── Constants ──────────────────────────────────────────────── */
const TASK_STATUSES = ['Pending', 'Ongoing', 'Done'];
const ENGAGEMENT_STATUSES = ['Ongoing', 'Completed', 'On Hold'];

function fmt(date: Date | string | null | undefined) {
  if (!date) return '—';
  return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function isOverdue(eng: Engagement) {
  return eng.status !== 'Completed' && new Date(eng.dueDate) < new Date();
}

type FilterKey = 'all' | 'ongoing' | 'overdue' | 'completed';

/* ── Summary Cards ──────────────────────────────────────────── */
function SummaryBar({
  engagements,
  activeFilter,
  onFilter,
}: {
  engagements: Engagement[];
  activeFilter: FilterKey;
  onFilter: (f: FilterKey) => void;
}) {
  const total = engagements.length;
  const ongoing = engagements.filter((e) => e.status === 'Ongoing').length;
  const overdue = engagements.filter(isOverdue).length;
  const completed = engagements.filter((e) => e.status === 'Completed').length;

  function card(key: FilterKey, num: number, label: string, colorClass?: string) {
    const active = activeFilter === key;
    return (
      <button
        type="button"
        onClick={() => onFilter(active ? 'all' : key)}
        className={`${styles.summaryCard} ${colorClass ?? ''} ${active ? styles.summaryCardActive : ''}`}
      >
        <div className={styles.summaryNum}>{num}</div>
        <div className={styles.summaryLabel}>{label}</div>
      </button>
    );
  }

  return (
    <div className={styles.summaryBar}>
      {card('all', total, 'Total Engagements')}
      {card('ongoing', ongoing, 'Ongoing', styles.summaryOngoing)}
      {card('overdue', overdue, 'Overdue', styles.summaryOverdue)}
      {card('completed', completed, 'Completed', styles.summaryCompleted)}
    </div>
  );
}

/* ── Add Engagement Modal ───────────────────────────────────── */
function AddEngagementModal({
  employees,
  onClose,
  onSave,
}: {
  employees: string[];
  onClose: () => void;
  onSave: (data: {
    companyName: string;
    engagement: string;
    proposalDate: Date;
    dueDate: Date;
    seniorAssigned: string;
    juniorAssigned: string[];
  }) => void;
}) {
  const [form, setForm] = useState({
    companyName: '',
    engagement: '',
    proposalDate: '',
    dueDate: '',
    seniorAssigned: '',
  });
  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  function submit() {
    if (!form.companyName || !form.engagement || !form.proposalDate || !form.dueDate || !form.seniorAssigned) return;
    onSave({
      companyName: form.companyName,
      engagement: form.engagement,
      proposalDate: new Date(form.proposalDate),
      dueDate: new Date(form.dueDate),
      seniorAssigned: form.seniorAssigned,
      juniorAssigned: [],
    });
  }

  const valid = form.companyName && form.engagement && form.proposalDate && form.dueDate && form.seniorAssigned;

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose}>×</button>
        <h2 className={styles.modalTitle}>New Special Engagement</h2>

        <div className={styles.formGrid}>
          <label className={styles.formLabel}>Company Name <span className={styles.req}>*</span></label>
          <input className={styles.formInput} value={form.companyName} onChange={(e) => set('companyName', e.target.value)} placeholder="e.g. ABC Corporation" autoFocus />

          <label className={styles.formLabel}>Engagement <span className={styles.req}>*</span></label>
          <input className={styles.formInput} value={form.engagement} onChange={(e) => set('engagement', e.target.value)} placeholder="e.g. Tax Advisory, Financial Review..." />

          <label className={styles.formLabel}>Date Proposal Signed <span className={styles.req}>*</span></label>
          <input className={styles.formInput} type="date" value={form.proposalDate} onChange={(e) => set('proposalDate', e.target.value)} />

          <label className={styles.formLabel}>Due Date <span className={styles.req}>*</span></label>
          <input className={styles.formInput} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />

          <label className={styles.formLabel}>Senior Assigned <span className={styles.req}>*</span></label>
          <MemberAutocomplete
            value={form.seniorAssigned}
            employees={employees}
            onChange={(v) => set('seniorAssigned', v)}
            placeholder="Type to search..."
          />

        </div>

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button type="button" className={styles.saveBtn} onClick={submit} disabled={!valid}>Save Engagement</button>
        </div>
      </div>
    </div>
  );
}

/* ── Member Autocomplete ────────────────────────────────────── */
function MemberAutocomplete({
  value,
  employees,
  onChange,
  placeholder,
}: {
  value: string;
  employees: string[];
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [inputVal, setInputVal] = useState(value);
  const [open, setOpen] = useState(false);
  const [dropdownStyle, setDropdownStyle] = useState<React.CSSProperties>({});
  const wrapRef = useRef<HTMLDivElement>(null);

  const suggestions = inputVal
    ? employees.filter((e) => e.toLowerCase().includes(inputVal.toLowerCase()) && e !== inputVal)
    : employees;

  useEffect(() => {
    if (open && wrapRef.current) {
      const rect = wrapRef.current.getBoundingClientRect();
      setDropdownStyle({
        position: 'fixed',
        top: rect.bottom + 4,
        left: rect.left,
        width: rect.width,
        zIndex: 9999,
      });
    }
  }, [open]);

  return (
    <div className={styles.acWrap} ref={wrapRef}>
      <input
        className={styles.formInput}
        value={inputVal}
        onChange={(e) => { setInputVal(e.target.value); onChange(e.target.value); setOpen(true); }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        placeholder={placeholder ?? 'Type to search member...'}
        autoComplete="off"
      />
      {open && suggestions.length > 0 && typeof document !== 'undefined' && createPortal(
        <div className={styles.acDropdown} style={dropdownStyle}>
          {suggestions.map((name) => (
            <div key={name} className={styles.acOption}
              onMouseDown={() => { setInputVal(name); onChange(name); setOpen(false); }}>
              {name}
            </div>
          ))}
        </div>,
        document.body
      )}
    </div>
  );
}

/* ── Add Task Modal ─────────────────────────────────────────── */
function AddTaskModal({
  employees,
  onClose,
  onSave,
}: {
  employees: string[];
  onClose: () => void;
  onSave: (data: { task: string; dueDate: Date | null; status: string; comments: string; assignedTo: string }) => void;
}) {
  const [form, setForm] = useState({ task: '', dueDate: '', status: 'Pending', comments: '', assignedTo: '' });

  function set(field: string, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.modalSm} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.modalClose} onClick={onClose}>×</button>
        <h2 className={styles.modalTitle}>Add Task</h2>

        <div className={styles.formGrid}>
          <label className={styles.formLabel}>Task <span className={styles.req}>*</span></label>
          <input className={styles.formInput} value={form.task} onChange={(e) => set('task', e.target.value)} placeholder="Describe the task..." autoFocus />

          <label className={styles.formLabel}>Assign Associate</label>
          <MemberAutocomplete
            value={form.assignedTo}
            employees={employees}
            onChange={(v) => set('assignedTo', v)}
            placeholder="Type or select a member..."
          />

          <label className={styles.formLabel}>Due Date</label>
          <input className={styles.formInput} type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />

          <label className={styles.formLabel}>Status</label>
          <select className={styles.formInput} value={form.status} onChange={(e) => set('status', e.target.value)}>
            {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <label className={styles.formLabel}>Comments</label>
          <input className={styles.formInput} value={form.comments} onChange={(e) => set('comments', e.target.value)} placeholder="Optional notes..." />
        </div>

        {form.assignedTo.trim() && (
          <p className={styles.assignNote}>
            🔗 This task will also appear in <strong>{form.assignedTo}</strong>&apos;s deliverables and status will stay in sync.
          </p>
        )}

        <div className={styles.modalActions}>
          <button type="button" className={styles.cancelBtn} onClick={onClose}>Cancel</button>
          <button
            type="button"
            className={styles.saveBtn}
            disabled={!form.task.trim()}
            onClick={() => onSave({
              task: form.task,
              dueDate: form.dueDate ? new Date(form.dueDate) : null,
              status: form.status,
              comments: form.comments,
              assignedTo: form.assignedTo,
            })}
          >
            Add Task
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Task Row ───────────────────────────────────────────────── */
function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: EngagementTask;
  onUpdate: (field: string, value: string) => void;
  onDelete: () => void;
}) {
  const [comments, setComments] = useState(task.comments);

  return (
    <tr className={styles.taskRow}>
      <td className={styles.taskCell}>
        <div>{task.task}</div>
        {task.assignedTo && (
          <div className={styles.taskAssignee}>
            {task.linkedTaskId ? '🔗' : '👤'} {task.assignedTo}
          </div>
        )}
      </td>
      <td className={styles.taskCell}>{fmt(task.createdDate)}</td>
      <td className={styles.taskCell}>{fmt(task.dueDate)}</td>
      <td className={styles.taskCell}>
        <select
          className={`${styles.statusSelect} ${styles[`status${task.status.replace(/\s/g, '')}`]}`}
          value={task.status}
          onChange={(e) => onUpdate('status', e.target.value)}
        >
          {TASK_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </td>
      <td className={styles.taskCell}>
        <input
          className={styles.commentsInput}
          value={comments}
          onChange={(e) => setComments(e.target.value)}
          onBlur={() => { if (comments !== task.comments) onUpdate('comments', comments); }}
          placeholder="Add comment..."
        />
      </td>
      <td className={styles.taskCell}>
        <button type="button" className={styles.deleteTaskBtn} onClick={onDelete} title="Delete task">×</button>
      </td>
    </tr>
  );
}

/* ── Engagement Row ─────────────────────────────────────────── */
function EngagementRow({
  eng,
  employees,
  onStatusChange,
  onDelete,
  onAddTask,
  onUpdateTask,
  onDeleteTask,
}: {
  eng: Engagement;
  employees: string[];
  onStatusChange: (status: string) => void;
  onDelete: () => void;
  onAddTask: (data: { task: string; dueDate: Date | null; status: string; comments: string; assignedTo: string }) => void;
  onUpdateTask: (taskId: string, field: string, value: string) => void;
  onDeleteTask: (taskId: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const overdue = isOverdue(eng);

  const doneTasks = eng.tasks.filter((t) => t.status === 'Done').length;

  return (
    <>
      {/* Main row */}
      <div className={`${styles.engRow} ${overdue ? styles.engRowOverdue : ''}`}>
        <div className={styles.engRowMain}>
          <div className={styles.engTitle}>
            <strong>{eng.companyName}</strong> — {eng.engagement}
          </div>
          <div className={styles.engMeta}>
            <span className={styles.engMetaItem}>👤 {eng.seniorAssigned || '—'}</span>
          </div>
          <div className={styles.engDates}>
            <span>Start: {fmt(eng.proposalDate)}</span>
            <span className={overdue ? styles.overdueDue : ''}>Due: {fmt(eng.dueDate)}</span>
          </div>
        </div>

        <div className={styles.engRowActions}>
          <select
            className={`${styles.engStatusSelect} ${styles[`engStatus${eng.status.replace(/\s/g, '')}`]}`}
            value={eng.status}
            onChange={(e) => onStatusChange(e.target.value)}
            onClick={(e) => e.stopPropagation()}
          >
            {ENGAGEMENT_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
          </select>

          <span className={styles.taskCount}>
            {doneTasks}/{eng.tasks.length} tasks
          </span>

          <button
            type="button"
            className={styles.expandBtn}
            onClick={() => setExpanded((v) => !v)}
            title={expanded ? 'Collapse tasks' : 'View tasks'}
          >
            {expanded ? '▲' : '▼'}
          </button>

          <button type="button" className={styles.deleteEngBtn} onClick={onDelete} title="Delete engagement">×</button>
        </div>
      </div>

      {/* Task panel */}
      {expanded && (
        <div className={styles.taskPanel}>
          <div className={styles.taskPanelHeader}>
            <span className={styles.taskPanelTitle}>Tasks</span>
            <button type="button" className={styles.addTaskBtn} onClick={() => setShowAddTask(true)}>
              + Add Task
            </button>
          </div>

          {eng.tasks.length === 0 ? (
            <p className={styles.noTasks}>No tasks yet. Click "+ Add Task" to get started.</p>
          ) : (
            <div className={styles.taskTableWrap}>
              <table className={styles.taskTable}>
                <thead>
                  <tr>
                    <th>Task</th>
                    <th>Created</th>
                    <th>Due Date</th>
                    <th>Status</th>
                    <th>Comments</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {eng.tasks.map((t) => (
                    <TaskRow
                      key={t.id}
                      task={t}
                      onUpdate={(field, value) => onUpdateTask(t.id, field, value)}
                      onDelete={() => onDeleteTask(t.id)}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {showAddTask && (
        <AddTaskModal
          employees={employees}
          onClose={() => setShowAddTask(false)}
          onSave={(data) => { onAddTask(data); setShowAddTask(false); setExpanded(true); }}
        />
      )}
    </>
  );
}

/* ── Main Page Client ───────────────────────────────────────── */
export default function EngagementPageClient({
  cluster,
  engagements: initialEngagements,
  employees,
}: {
  cluster: ClusterSlug;
  engagements: Engagement[];
  employees: string[];
}) {
  const [engagements, setEngagements] = useState<Engagement[]>(initialEngagements);
  const [showAdd, setShowAdd] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [, startTransition] = useTransition();

  function mutateEng(id: string, updater: (e: Engagement) => Engagement) {
    setEngagements((prev) => prev.map((e) => (e.id === id ? updater(e) : e)));
  }

  function handleCreate(data: {
    companyName: string;
    engagement: string;
    proposalDate: Date;
    dueDate: Date;
    seniorAssigned: string;
    juniorAssigned: string[];
  }) {
    startTransition(async () => {
      const result = await createEngagementAction(cluster, data);
      setEngagements((prev) => [result as unknown as Engagement, ...prev]);
      setShowAdd(false);
    });
  }

  function handleStatusChange(id: string, status: string) {
    mutateEng(id, (e) => ({ ...e, status }));
    startTransition(async () => { await updateEngagementStatusAction(id, status); });
  }

  function handleDelete(id: string) {
    if (!confirm('Delete this engagement and all its tasks? This cannot be undone.')) return;
    setEngagements((prev) => prev.filter((e) => e.id !== id));
    startTransition(async () => { await deleteEngagementAction(id); });
  }

  function handleAddTask(engId: string, data: { task: string; dueDate: Date | null; status: string; comments: string; assignedTo: string }) {
    startTransition(async () => {
      const newTask = await addEngagementTaskAction(engId, data);
      mutateEng(engId, (e) => ({ ...e, tasks: [...e.tasks, newTask as unknown as EngagementTask] }));
    });
  }

  function handleUpdateTask(engId: string, taskId: string, field: string, value: string) {
    mutateEng(engId, (e) => ({
      ...e,
      tasks: e.tasks.map((t) => (t.id === taskId ? { ...t, [field]: value } : t)),
    }));
    startTransition(async () => {
      await updateEngagementTaskAction(taskId, { [field]: value });
    });
  }

  function handleDeleteTask(engId: string, taskId: string) {
    if (!confirm('Delete this task?')) return;
    mutateEng(engId, (e) => ({ ...e, tasks: e.tasks.filter((t) => t.id !== taskId) }));
    startTransition(async () => { await deleteEngagementTaskAction(taskId); });
  }

  return (
    <div className={styles.page}>
      <div className={styles.pageHeader}>
        <div>
          <h1 className={styles.pageTitle}>Special Engagement Monitoring</h1>
          <p className={styles.pageSubtitle}>Track and manage special engagement projects</p>
        </div>
        <button type="button" className={styles.addEngBtn} onClick={() => setShowAdd(true)}>
          + Add Engagement
        </button>
      </div>

      {/* Summary */}
      <SummaryBar engagements={engagements} activeFilter={activeFilter} onFilter={setActiveFilter} />

      {/* Engagement list */}
      {(() => {
        const filtered = engagements.filter((e) => {
          if (activeFilter === 'ongoing') return e.status === 'Ongoing';
          if (activeFilter === 'overdue') return isOverdue(e);
          if (activeFilter === 'completed') return e.status === 'Completed';
          return true;
        });
        const filterLabel: Record<FilterKey, string> = {
          all: 'Engagements',
          ongoing: 'Ongoing',
          overdue: 'Overdue',
          completed: 'Completed',
        };
        return (
      <div className={styles.panel}>
        <div className={styles.panelHeader}>
          <span className={styles.panelTitle}>{filterLabel[activeFilter]}</span>
          <span className={styles.panelCount}>{filtered.length}</span>
        </div>

        {filtered.length === 0 ? (
          <div className={styles.empty}>
            <div className={styles.emptyIcon}>📋</div>
            <p className={styles.emptyTitle}>{activeFilter === 'all' ? 'No engagements yet' : `No ${filterLabel[activeFilter].toLowerCase()} engagements`}</p>
            <p className={styles.emptyDesc}>{activeFilter === 'all' ? 'Click "+ Add Engagement" to get started.' : 'Click "Total Engagements" to show all.'}</p>
          </div>
        ) : (
          <div className={styles.engList}>
            {filtered.map((eng) => (
              <EngagementRow
                key={eng.id}
                eng={eng}
                employees={employees}
                onStatusChange={(status) => handleStatusChange(eng.id, status)}
                onDelete={() => handleDelete(eng.id)}
                onAddTask={(data) => handleAddTask(eng.id, data)}
                onUpdateTask={(taskId, field, value) => handleUpdateTask(eng.id, taskId, field, value)}
                onDeleteTask={(taskId) => handleDeleteTask(eng.id, taskId)}
              />
            ))}
          </div>
        )}
      </div>
        );
      })()}

      {showAdd && (
        <AddEngagementModal
          employees={employees}
          onClose={() => setShowAdd(false)}
          onSave={handleCreate}
        />
      )}
    </div>
  );
}
