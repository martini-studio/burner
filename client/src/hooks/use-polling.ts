import { useEffect, useRef } from 'react';
import type { QueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { getSettings, hasCredentials } from '@/lib/settings';

export function useMessagePolling(queryClient: QueryClient) {
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    function startPolling() {
      if (timerRef.current) clearInterval(timerRef.current);

      const settings = getSettings();
      if (!hasCredentials() || !settings.pollingInterval) return;

      const poll = async () => {
        try {
          const count = await api.sync.pollIncoming();
          if (count > 0) {
            queryClient.invalidateQueries({ queryKey: ['numbers'] });
            queryClient.invalidateQueries({ queryKey: ['conversations'] });
            queryClient.invalidateQueries({ queryKey: ['messages'] });
          }
        } catch {
          // Silently ignore polling errors
        }
      };

      poll();
      timerRef.current = setInterval(poll, settings.pollingInterval);
    }

    startPolling();

    const handleStorage = (e: StorageEvent) => {
      if (e.key === 'burner_settings') startPolling();
    };
    window.addEventListener('storage', handleStorage);

    const handleSettingsChange = () => startPolling();
    window.addEventListener('burner-settings-changed', handleSettingsChange);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      window.removeEventListener('storage', handleStorage);
      window.removeEventListener('burner-settings-changed', handleSettingsChange);
    };
  }, [queryClient]);
}
