'use client';

import { useEffect, useState, type CSSProperties } from 'react';
import { createPortal } from 'react-dom';

/** Full-screen overlay showing the photo enlarged. Closes on click or ESC. */
export function PhotoLightbox({ photo, onClose }: { photo: string; onClose: () => void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return createPortal(
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 200,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'zoom-out',
        animation: 'modalOverlayIn 0.25s ease forwards',
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={photo}
        alt="Profile photo"
        style={{
          width: 'min(280px, 70vw)',
          height: 'min(280px, 70vw)',
          objectFit: 'cover',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(15,23,42,0.45)',
          animation: 'modalCardIn 0.25s ease-out forwards',
        }}
      />
    </div>,
    document.body
  );
}

/** Circle avatar that shows the uploaded photo when present, else the fallback letter.
 *  When a photo exists, clicking it opens an enlarged preview. */
export default function PhotoAvatar({
  photo,
  letter,
  className,
  style,
}: {
  photo: string | null | undefined;
  letter: string;
  className?: string;
  style?: CSSProperties;
}) {
  const [viewing, setViewing] = useState(false);

  if (photo) {
    return (
      <>
        <span
          className={className}
          style={{ ...style, background: 'transparent', overflow: 'hidden', flex: 'none', cursor: 'zoom-in' }}
          title="View photo"
          onClick={(e) => {
            // avatars often sit inside row links — don't navigate, just preview
            e.preventDefault();
            e.stopPropagation();
            setViewing(true);
          }}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={photo}
            alt=""
            style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
          />
        </span>
        {viewing && <PhotoLightbox photo={photo} onClose={() => setViewing(false)} />}
      </>
    );
  }
  return (
    <span className={className} style={style}>
      {letter}
    </span>
  );
}
