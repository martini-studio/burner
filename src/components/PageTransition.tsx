import { useEffect, useState, type ReactNode } from 'react';

interface Props {
  children: ReactNode;
  direction?: 'forward' | 'back';
}

export function PageTransition({ children }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setMounted(true));
  }, []);

  return (
    <div
      className={`flex flex-col min-h-0 h-full transition-all duration-200 ease-out ${
        mounted ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-4'
      }`}
    >
      {children}
    </div>
  );
}
