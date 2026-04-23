import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Plus, MessageSquare, Trash2 } from 'lucide-react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { AppHeader } from '@/components/AppHeader';
import { formatDistanceToNow } from 'date-fns';
import { useState, useRef } from 'react';
import { toast } from 'sonner';
import type { Conversation } from '@/types';

function formatPhone(phone: string) {
  if (phone.startsWith('+61')) {
    const local = phone.slice(3);
    return `+61 ${local.slice(0, 3)} ${local.slice(3, 6)} ${local.slice(6)}`;
  }
  if (phone.startsWith('+1')) {
    const local = phone.slice(2);
    return `+1 (${local.slice(0, 3)}) ${local.slice(3, 6)}-${local.slice(6)}`;
  }
  return phone;
}

function getInitials(name: string | null, phone: string) {
  if (name) {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2);
  }
  return phone.slice(-2);
}

function getAvatarColor(id: number) {
  const colors = [
    'from-blue-400 to-blue-600',
    'from-green-400 to-green-600',
    'from-purple-400 to-purple-600',
    'from-orange-400 to-orange-600',
    'from-pink-400 to-pink-600',
    'from-cyan-400 to-cyan-600',
    'from-amber-400 to-amber-600',
    'from-indigo-400 to-indigo-600',
  ];
  return colors[id % colors.length];
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

  const deleteMutation = useMutation({
    mutationFn: api.conversations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      toast.success('Conversation deleted');
    },
  });

  return (
    <>
      <AppHeader className="gap-1 px-2">
        <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate('/')}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex-1 min-w-0 px-1">
          <h1 className="text-[15px] font-semibold truncate">
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
          className="h-9 w-9"
          onClick={() => navigate(`/number/${numberId}/new`)}
        >
          <Plus className="h-5 w-5" />
        </Button>
      </AppHeader>

      <main>
        <div className="max-w-lg mx-auto w-full pt-app-header">
          {isLoading ? (
            <div className="divide-y divide-border">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3.5">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28 mb-2" />
                    <Skeleton className="h-3 w-48" />
                  </div>
                </div>
              ))}
            </div>
          ) : conversations && conversations.length > 0 ? (
            <div className="divide-y divide-border">
              {conversations.map((conv) => (
                <ConversationRow
                  key={conv.id}
                  conversation={conv}
                  onTap={() => {
                    api.conversations.markRead(conv.id);
                    queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
                    navigate(`/number/${numberId}/chat/${conv.id}`);
                  }}
                  onDelete={() => deleteMutation.mutate(conv.id)}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <MessageSquare className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">No Conversations</h2>
              <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
                Start a new conversation by sending a message.
              </p>
              <Button size="lg" onClick={() => navigate(`/number/${numberId}/new`)} className="gap-2 rounded-full px-6">
                <Plus className="h-4 w-4" /> New Message
              </Button>
            </div>
          )}
        </div>
      </main>
    </>
  );
}

function ConversationRow({
  conversation,
  onTap,
  onDelete,
}: {
  conversation: Conversation;
  onTap: () => void;
  onDelete: () => void;
}) {
  const [swipeX, setSwipeX] = useState(0);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handleTouchStart = (e: React.TouchEvent) => {
    startX.current = e.touches[0].clientX;
    isDragging.current = false;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const diff = startX.current - e.touches[0].clientX;
    if (diff > 10) {
      isDragging.current = true;
      setSwipeX(Math.min(diff, 80));
    } else {
      setSwipeX(0);
    }
  };

  const handleTouchEnd = () => {
    if (swipeX > 60) {
      setSwipeX(80);
    } else {
      setSwipeX(0);
    }
  };

  const hasUnread = conversation.unread_count > 0;

  return (
    <div className="relative overflow-hidden">
      <div
        className="absolute right-0 top-0 bottom-0 flex items-center justify-center bg-destructive text-destructive-foreground transition-all"
        style={{ width: swipeX > 0 ? `${swipeX}px` : '0' }}
        onClick={(e) => {
          e.stopPropagation();
          if (confirm('Delete this conversation?')) onDelete();
        }}
      >
        <Trash2 className="h-5 w-5" />
      </div>
      <div
        className="flex items-center gap-3 px-4 py-3.5 bg-background active:bg-muted/50 transition-all cursor-pointer select-none"
        style={{ transform: `translateX(-${swipeX}px)` }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (!isDragging.current) onTap();
        }}
      >
        <div className={`w-12 h-12 rounded-full bg-linear-to-br ${getAvatarColor(conversation.id)} flex items-center justify-center shrink-0`}>
          <span className="text-sm font-semibold text-white">
            {getInitials(conversation.contact_name, conversation.contact_number)}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <span className={`text-[15px] truncate ${hasUnread ? 'font-semibold text-foreground' : 'font-medium text-foreground'}`}>
              {conversation.contact_name || formatPhone(conversation.contact_number)}
            </span>
            {conversation.last_message_at && (
              <span className={`text-xs shrink-0 ${hasUnread ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
                {formatDistanceToNow(new Date(conversation.last_message_at + 'Z'), { addSuffix: false })}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <p className={`text-[13px] truncate flex-1 leading-snug ${hasUnread ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
              {conversation.last_message || 'No messages yet'}
            </p>
            {hasUnread && (
              <Badge className="h-5 min-w-5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground shrink-0">
                {conversation.unread_count}
              </Badge>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
