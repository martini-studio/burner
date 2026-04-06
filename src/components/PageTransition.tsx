import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  direction?: 'forward' | 'back';
}

export function PageTransition({ children }: Props) {
  const [mounted, setMounted] = useState(false);
  const [viewportHeight, setViewportHeight] = useState<number | null>(null);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;

    let timeout: ReturnType<typeof setTimeout>;
    const updateHeight = () => {
      clearTimeout(timeout);
      timeout = setTimeout(() => setViewportHeight(vv.height), 100);
    };
    setViewportHeight(vv.height);

    vv.addEventListener('resize', updateHeight);
    return () => {
      clearTimeout(timeout);
      vv.removeEventListener('resize', updateHeight);
    };
  }, []);

  return (
    <div
      style={viewportHeight != null ? { height: viewportHeight } : undefined}
      className={`flex flex-col relative top-0 min-h-0 transition-all duration-200 ease-out ${
        viewportHeight == null ? 'h-dvh' : ''
      } ${mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'}`}
    >
      {children}
    </div>
  );
}
