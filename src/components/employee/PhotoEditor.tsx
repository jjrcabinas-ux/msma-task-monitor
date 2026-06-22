'use client';

import { useRef, useState, useTransition } from 'react';
import { updatePhotoPositionAction, uploadPhotoAction } from '@/lib/actions';
import styles from '@/app/employee/[id]/employee.module.css';

type DragState = {
  startClientX: number;
  startClientY: number;
  startPosX: number;
  startPosY: number;
  boxW: number;
  boxH: number;
};

export default function PhotoEditor({
  employeeId,
  initial,
  photoPath,
  photoPosX,
  photoPosY,
  color,
}: {
  employeeId: string;
  initial: string;
  photoPath: string | null;
  photoPosX: number;
  photoPosY: number;
  color: string;
}) {
  const [open, setOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [error, setError] = useState('');
  const [pending, startTransition] = useTransition();
  const [pos, setPos] = useState({ x: photoPosX, y: photoPosY });
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const naturalSizeRef = useRef<{ w: number; h: number } | null>(null);
  const dragRef = useRef<DragState | null>(null);

  function submitFile(file: File) {
    setError('');
    const formData = new FormData();
    formData.set('file', file);
    startTransition(async () => {
      const result = await uploadPhotoAction(employeeId, formData);
      if ('error' in result) setError(result.error);
      else setPos({ x: 50, y: 50 });
    });
  }

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    if (!photoPath || !naturalSizeRef.current) return;
    const box = dropZoneRef.current;
    if (!box) return;
    box.setPointerCapture(e.pointerId);
    dragRef.current = {
      startClientX: e.clientX,
      startClientY: e.clientY,
      startPosX: pos.x,
      startPosY: pos.y,
      boxW: box.clientWidth,
      boxH: box.clientHeight,
    };
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current;
    const natural = naturalSizeRef.current;
    if (!drag || !natural) return;
    const scale = Math.max(drag.boxW / natural.w, drag.boxH / natural.h);
    const overflowX = natural.w * scale - drag.boxW;
    const overflowY = natural.h * scale - drag.boxH;
    const dx = e.clientX - drag.startClientX;
    const dy = e.clientY - drag.startClientY;

    let nextX = overflowX > 0 ? drag.startPosX - (dx / overflowX) * 100 : drag.startPosX;
    let nextY = overflowY > 0 ? drag.startPosY - (dy / overflowY) * 100 : drag.startPosY;
    nextX = Math.max(0, Math.min(100, nextX));
    nextY = Math.max(0, Math.min(100, nextY));
    setPos({ x: nextX, y: nextY });
  }

  function handlePointerUp() {
    if (!dragRef.current) return;
    dragRef.current = null;
    startTransition(async () => {
      await updatePhotoPositionAction(employeeId, pos.x, pos.y);
    });
  }

  const positionValue = `${pos.x}% ${pos.y}%`;
  const avatarStyle: React.CSSProperties = photoPath
    ? { background: '#0f172a', backgroundImage: `url(${photoPath})`, backgroundPosition: positionValue }
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
          <div className={styles.photoHint}>
            {photoPath ? 'Drag the photo to reposition it' : 'Drag an image in, or click to browse'}
          </div>
          {error && <div className={styles.photoError}>{error}</div>}
          <div
            ref={dropZoneRef}
            className={`${styles.dropZone} ${dragActive ? styles.dropZoneActive : ''}`}
            style={
              photoPath
                ? {
                    backgroundImage: `url(${photoPath})`,
                    backgroundPosition: positionValue,
                    color: 'transparent',
                    cursor: 'grab',
                    touchAction: 'none',
                  }
                : undefined
            }
            onClick={() => {
              if (!photoPath) fileInputRef.current?.click();
            }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
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
          {photoPath && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={photoPath}
              alt=""
              style={{ display: 'none' }}
              onLoad={(e) => {
                naturalSizeRef.current = { w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight };
              }}
            />
          )}
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
          {photoPath && (
            <button className={styles.replaceBtn} onClick={() => fileInputRef.current?.click()}>
              Replace photo
            </button>
          )}
        </div>
      )}
    </>
  );
}
