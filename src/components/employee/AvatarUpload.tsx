'use client';

import { useRef, useState } from 'react';
import Image from 'next/image';
import { updateEmployeePhotoAction } from '@/lib/actions';
import { PhotoLightbox } from '@/components/PhotoAvatar';
import styles from './AvatarUpload.module.css';

const MAX_SIZE = 200; // px — canvas output size

function resizeToDataUrl(file: File): Promise<string> {
  return new Promise((resolve) => {
    const img = new window.Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = MAX_SIZE;
      canvas.height = MAX_SIZE;
      const ctx = canvas.getContext('2d')!;
      // Cover-crop: centre the image
      const scale = Math.max(MAX_SIZE / img.width, MAX_SIZE / img.height);
      const w = img.width * scale;
      const h = img.height * scale;
      ctx.drawImage(img, (MAX_SIZE - w) / 2, (MAX_SIZE - h) / 2, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL('image/jpeg', 0.82));
    };
    img.src = url;
  });
}

export default function AvatarUpload({
  employeeId,
  initialPhoto,
  fallbackLetter,
  fallbackColor,
  canEdit,
  size = 52,
}: {
  employeeId: string;
  initialPhoto: string | null;
  fallbackLetter: string;
  fallbackColor: string;
  canEdit: boolean;
  size?: number;
}) {
  const [photo, setPhoto] = useState<string | null>(initialPhoto);
  const [saving, setSaving] = useState(false);
  const [viewing, setViewing] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setSaving(true);
    const dataUrl = await resizeToDataUrl(file);
    setPhoto(dataUrl);
    await updateEmployeePhotoAction(employeeId, dataUrl);
    setSaving(false);
    // reset so same file can be re-selected
    e.target.value = '';
  }

  return (
    <div className={styles.wrap} style={{ width: size, height: size }}>
      {/* Avatar circle */}
      <div
        className={styles.avatar}
        style={{
          width: size,
          height: size,
          background: photo ? 'transparent' : fallbackColor,
          cursor: photo ? 'zoom-in' : 'default',
        }}
        title={photo ? 'View photo' : undefined}
        onClick={() => photo && setViewing(true)}
      >
        {photo ? (
          <Image src={photo} alt="Profile" width={size} height={size} className={styles.avatarImg} />
        ) : (
          <span className={styles.letter} style={{ fontSize: size * 0.4 }}>{fallbackLetter}</span>
        )}
      </div>

      {viewing && photo && <PhotoLightbox photo={photo} onClose={() => setViewing(false)} />}

      {/* Camera badge */}
      {canEdit && (
        <>
          <button
            type="button"
            className={`${styles.badge} ${saving ? styles.badgeSaving : ''}`}
            onClick={() => inputRef.current?.click()}
            title="Change photo"
            disabled={saving}
          >
            {saving ? (
              '…'
            ) : (
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
            )}
          </button>
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            onChange={handleFile}
            style={{ display: 'none' }}
          />
        </>
      )}
    </div>
  );
}
