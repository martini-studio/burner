import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';

function formatPhone(phone: string) {
  if (phone.startsWith('+61')) {
    const local = phone.slice(3);
    return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
  }
  return phone;
}

function getInitials(name: string | null, phone: string) {
  if (name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  return phone.slice(-2);
}

export function ConversationsPage() {
  const { numberId } = useParams<{ numberId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: numbers } = useQuery({
    queryKey: ['numbers'],
    queryFn: api.numbers.list,
  });

  const currentNumber = numbers?.find(n => n.id === Number(numberId));

  const { data: conversations, isLoading } = useQuery({
    queryKey: ['conversations', numberId],
    queryFn: () => api.conversations.listByNumber(Number(numberId)),
    enabled: !!numberId,
  });

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" onClick={() => navigate('/')}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base font-semibold truncate">
              {currentNumber?.label || formatPhone(currentNumber?.phone_number || '')}
            </h1>
            {currentNumber?.label && (
              <p className="text-xs text-muted-foreground truncate">
                {formatPhone(currentNumber.phone_number)}
              </p>
            )}
          </div>
          <Button
            size="icon"
            variant="ghost"
            onClick={() => navigate(`/number/${numberId}/new`)}
          >
            <Plus className="h-5 w-5" />
          </Button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto w-full">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-16 w-full rounded-xl" />
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <div
                  key={conv.id}
                  className="flex items-center gap-3 px-4 py-3 active:bg-muted/50 transition-colors cursor-pointer select-none"
                  onClick={() => {
                    api.conversations.markRead(conv.id);
                    queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
                    navigate(`/number/${numberId}/chat/${conv.id}`);
                  }}
                >
                  <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-semibold text-primary">
                      {getInitials(conv.contact_name, conv.contact_number)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className={`text-sm truncate ${conv.unread_count > 0 ? 'font-semibold' : 'font-medium'}`}>
                        {conv.contact_name || formatPhone(conv.contact_number)}
                      </span>
                      {conv.last_message_at && (
                        <span className="text-xs text-muted-foreground shrink-0">
                          {formatDistanceToNow(new Date(conv.last_message_at + 'Z'), { addSuffix: true })}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className={`text-xs truncate flex-1 ${conv.unread_count > 0 ? 'text-foreground' : 'text-muted-foreground'}`}>
                        {conv.last_message || 'No messages yet'}
                      </p>
                      {conv.unread_count > 0 && (
                        <Badge variant="default" className="h-5 min-w-5 px-1.5 text-xs rounded-full shrink-0">
                          {conv.unread_count}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[60vh] px-8 text-center">
              <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <MessageSquare className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No conversations</h2>
              <p className="text-muted-foreground mb-6">
                Start a new conversation by tapping the + button.
              </p>
              <Button onClick={() => navigate(`/number/${numberId}/new`)} className="gap-2">
                <Plus className="h-4 w-4" /> New Message
              </Button>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
