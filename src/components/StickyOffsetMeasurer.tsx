'use client';

import { useEffect, useRef } from 'react';

export default function StickyOffsetMeasurer({
  children,
  className,
  cssVar = '--sticky-offset',
}: {
  children: React.ReactNode;
  className?: string;
  cssVar?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    function update() {
      document.documentElement.style.setProperty(cssVar, `${el!.getBoundingClientRect().height}px`);
    }

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    window.addEventListener('resize', update);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [cssVar]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
