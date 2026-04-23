import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface AppHeaderProps {
  children: ReactNode;
  className?: string;
}

export function AppHeader({ children, className }: AppHeaderProps) {
  return (
    <header className="absolute top-0 inset-x-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
      <div className={cn('flex items-center h-14 max-w-lg mx-auto w-full', className)}>
        {children}
      </div>
    </header>
  );
}
