import { Outlet, useLocation } from 'react-router-dom';
import { PageTransition } from '@/components/PageTransition';

export function AppLayout() {
  const location = useLocation();

  return (
    <PageTransition key={location.pathname}>
      <Outlet />
    </PageTransition>
  );
}
