'use client';

import { useState, useTransition, type CSSProperties } from 'react';
import { updateEmployeeAction } from '@/lib/actions';
import { displayName } from '@/lib/analytics';
import { fmtLongDate } from '@/lib/dates';
import type { ClusterSlug } from '@/lib/clusters';
import type { EmployeeDTO } from '@/lib/types';
import PhotoAvatar from '@/components/PhotoAvatar';
import styles from './KpiModalCard.module.css';
import summaryStyles from '@/app/[cluster]/summary.module.css';

export default function MemberRow({
  employee,
  cluster,
  avatarStyle,
  canEdit,
}: {
  employee: EmployeeDTO;
  cluster: ClusterSlug;
  avatarStyle: CSSProperties;
  canEdit: boolean;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: employee.name,
    nickname: employee.nickname,
    position: employee.position,
    email: employee.email,
    birthDate: employee.birthDate || '',
    contactNumber: employee.contactNumber,
  });
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();

  const name = displayName(employee);

  function updateField(field: keyof typeof form, value: string) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function startEdit() {
    setForm({
      name: employee.name,
      nickname: employee.nickname,
      position: employee.position,
      email: employee.email,
      birthDate: employee.birthDate || '',
      contactNumber: employee.contactNumber,
    });
    setError('');
    setEditing(true);
  }

  function save() {
    startTransition(async () => {
      const result = await updateEmployeeAction(employee.id, cluster, form);
      if ('error' in result) {
        setError(result.error);
        return;
      }
      setError('');
      setEditing(false);
    });
  }

  if (editing) {
    return (
      <div className={styles.memberRow}>
        <div className={styles.editForm}>
          <input
            value={form.name}
            onChange={(e) => updateField('name', e.target.value)}
            placeholder="Full name"
            className={styles.editInput}
            disabled={pending}
          />
          <input
            value={form.nickname}
            onChange={(e) => updateField('nickname', e.target.value)}
            placeholder="Nickname (display name)"
            className={styles.editInput}
            disabled={pending}
          />
          <input
            value={form.position}
            onChange={(e) => updateField('position', e.target.value)}
            placeholder="Position"
            className={styles.editInput}
            disabled={pending}
          />
          <input
            type="email"
            value={form.email}
            onChange={(e) => updateField('email', e.target.value)}
            placeholder="Email address"
            className={styles.editInput}
            disabled={pending}
          />
          <label className={styles.editFieldLabel}>Birth date</label>
          <input
            type="date"
            value={form.birthDate}
            onChange={(e) => updateField('birthDate', e.target.value)}
            className={styles.editInput}
            disabled={pending}
          />
          <input
            type="tel"
            value={form.contactNumber}
            onChange={(e) => updateField('contactNumber', e.target.value)}
            placeholder="Contact number"
            className={styles.editInput}
            disabled={pending}
          />
          {error && <div className={styles.editError}>{error}</div>}
          <div className={styles.editActions}>
            <button onClick={save} className={styles.saveBtn} disabled={pending}>
              Save
            </button>
            <button onClick={() => setEditing(false)} className={styles.cancelEditBtn} disabled={pending}>
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.memberRow}>
      <div className={styles.memberRowTop}>
        <PhotoAvatar photo={employee.photo} letter={name[0]} className={summaryStyles.avatar} style={avatarStyle} />
        <div className={styles.memberRowTopBody}>
          <div className={styles.memberName}>{name}</div>
          <div className={styles.memberPosition}>{employee.position || '—'}</div>
        </div>
        {canEdit && (
          <button type="button" className={styles.editBtn} onClick={startEdit}>
            Edit
          </button>
        )}
      </div>
      <div className={styles.memberDetails}>
        <div>
          <div className={styles.memberDetailLabel}>Name</div>
          <div>{employee.name}</div>
        </div>
        <div>
          <div className={styles.memberDetailLabel}>Email</div>
          <div>{employee.email || '—'}</div>
        </div>
        <div>
          <div className={styles.memberDetailLabel}>Birth Date</div>
          <div>{employee.birthDate ? fmtLongDate(employee.birthDate) : '—'}</div>
        </div>
        <div>
          <div className={styles.memberDetailLabel}>Contact Number</div>
          <div>{employee.contactNumber || '—'}</div>
        </div>
      </div>
    </div>
  );
}
