import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { HomePage } from '@/pages/HomePage';
import { ConversationsPage } from '@/pages/ConversationsPage';
import { ChatPage } from '@/pages/ChatPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useTheme } from '@/hooks/use-theme';
import { useMessagePolling } from '@/hooks/use-polling';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2000,
    },
  },
});

function AppContent() {
  useTheme();
  useMessagePolling(queryClient);

  return (
    <BrowserRouter basename={import.meta.env.BASE_URL}>
      <div className="flex flex-col h-dvh bg-background overflow-hidden">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="/number/:numberId" element={<ConversationsPage />} />
          <Route path="/number/:numberId/chat/:conversationId" element={<ChatPage />} />
          <Route path="/number/:numberId/new" element={<ChatPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
