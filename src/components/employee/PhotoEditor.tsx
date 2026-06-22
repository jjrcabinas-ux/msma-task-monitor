'use client';

import { useRef, useState, useTransition } from 'react';
import { uploadPhotoAction } from '@/lib/actions';
import styles from '@/app/employee/[id]/employee.module.css';

export default function PhotoEditor({
  employeeId,
  initial,
  photoPath,
  color,
}: {
  employeeId: string;
  initial: string;
  photoPath: string | null;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const fileInputRef = useRef<HTMLInputElement>(null);

  function submitFile(file: File) {
    setError('');
    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      const result = await uploadPhotoAction(employeeId, formData);
      if ('error' in result) setError(result.error);
    });
  }

  const avatarStyle: React.CSSProperties = photoPath
    ? { background: '#0f172a', backgroundImage: `url(${photoPath})` }
    : { background: color };

  return (
    <>
      <div className={styles.avatarBig} style={avatarStyle} onClick={() => setOpen((o) => !o)}>
        {!photoPath && <span>{initial}</span>}
        <div className={styles.editBadge} title="Edit profile photo">
          ✎
        </div>
      </div>
      {open && (
        <div className={`${styles.popover} ${styles.photoPopover}`}>
          <div className={styles.photoTitle}>Edit profile photo</div>
          <div className={styles.photoHint}>Drag an image in, or click to browse</div>
          {error && <div className={styles.photoError}>{error}</div>}
          <div
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            style={photoPath ? { backgroundImage: `url(${photoPath})`, color: 'transparent' } : undefined}
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragActive(false);
              const file = e.dataTransfer.files?.[0];
              if (file) submitFile(file);
            }}
          >
            {!photoPath && (pending ? 'Uploading…' : 'Add photo')}
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            style={{ display: 'none' }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) submitFile(file);
            }}
          />
          <button className={styles.doneBtn} onClick={() => setOpen(false)}>
            Done
          </button>
        </div>
      )}
    </>
  );
}
