import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from '@/components/ui/sonner';
import { HomePage } from '@/pages/HomePage';
import { ConversationsPage } from '@/pages/ConversationsPage';
import { ChatPage } from '@/pages/ChatPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchInterval: 5000,
      staleTime: 2000,
    },
  },
});

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div className="flex flex-col h-dvh bg-background overflow-hidden">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/number/:numberId" element={<ConversationsPage />} />
            <Route path="/number/:numberId/chat/:conversationId" element={<ChatPage />} />
            <Route path="/number/:numberId/new" element={<ChatPage />} />
          </Routes>
        </div>
      </BrowserRouter>
      <Toaster position="top-center" />
    </QueryClientProvider>
  );
}
