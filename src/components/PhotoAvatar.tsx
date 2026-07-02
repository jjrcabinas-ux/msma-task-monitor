import type { CSSProperties } from 'react';

/** Circle avatar that shows the uploaded photo when present, else the fallback letter. */
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
  if (photo) {
    return (
      <span className={className} style={{ ...style, background: 'transparent', overflow: 'hidden', flex: 'none' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={photo}
          alt=""
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        />
      </span>
    );
  }
  return (
    <span className={className} style={style}>
      {letter}
    </span>
  );
}
