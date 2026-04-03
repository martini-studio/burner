import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Phone, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Conversation, Message } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { format, isToday, isYesterday, isSameDay } from 'date-fns';
import { toast } from 'sonner';
import { NewConversationHeader } from '@/components/NewConversationHeader';

function formatPhone(phone: string) {
  if (phone.startsWith('+61')) {
    const local = phone.slice(3);
    return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
  }
  return phone;
}

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr + 'Z');
  return format(date, 'HH:mm');
}

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr + 'Z');
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMMM yyyy');
}

export function ChatPage() {
  const { numberId, conversationId } = useParams<{ numberId: string; conversationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [activeConvId, setActiveConvId] = useState<number | null>(
    conversationId ? Number(conversationId) : null
  );
  const [isNewConversation, setIsNewConversation] = useState(!conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState('');

  const { data: numbers } = useQuery({
    queryKey: ['numbers'],
    queryFn: api.numbers.list,
  });
  const currentNumber = numbers?.find(n => n.id === Number(numberId));

  const { data: conversations } = useQuery({
    queryKey: ['conversations', numberId],
    queryFn: () => api.conversations.listByNumber(Number(numberId)),
    enabled: !!numberId,
  });

  const conversation = conversations?.find(c => c.id === activeConvId) ?? null;

  const { data: messages, isLoading: messagesLoading } = useQuery({
    queryKey: ['messages', activeConvId],
    queryFn: () => api.messages.listByConversation(activeConvId!),
    enabled: !!activeConvId,
  });

  const sendMutation = useMutation({
    mutationFn: ({ convId, body }: { convId: number; body: string }) =>
      api.messages.send(convId, body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConvId] });
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      setMessage('');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const updateContactMutation = useMutation({
    mutationFn: ({ id, name }: { id: number; name: string }) =>
      api.conversations.update(id, name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      setEditingContact(false);
      toast.success('Contact updated');
    },
  });

  const deleteConvMutation = useMutation({
    mutationFn: api.conversations.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      navigate(`/number/${numberId}`);
      toast.success('Conversation deleted');
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (conversation) {
      setContactName(conversation.contact_name || '');
    }
  }, [conversation]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text) return;

    if (activeConvId) {
      sendMutation.mutate({ convId: activeConvId, body: text });
    }
  };

  const handleNewConversation = async (contactNumber: string) => {
    try {
      const conv = await api.conversations.create(Number(numberId), contactNumber);
      setActiveConvId(conv.id);
      setIsNewConversation(false);
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      navigate(`/number/${numberId}/chat/${conv.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const renderMessages = (msgs: Message[]) => {
    const elements: React.ReactNode[] = [];
    let lastDate: string | null = null;

    msgs.forEach((msg, i) => {
      const msgDate = new Date(msg.created_at + 'Z');
      const dateKey = format(msgDate, 'yyyy-MM-dd');

      if (dateKey !== lastDate) {
        elements.push(
          <div key={`date-${dateKey}`} className="flex justify-center my-4">
            <span className="text-xs text-muted-foreground bg-muted/50 px-3 py-1 rounded-full">
              {formatDateSeparator(msg.created_at)}
            </span>
          </div>
        );
        lastDate = dateKey;
      }

      const isOutbound = msg.direction === 'outbound';
      const showTail = i === msgs.length - 1 ||
        msgs[i + 1]?.direction !== msg.direction ||
        !isSameDay(new Date(msgs[i + 1]?.created_at + 'Z'), msgDate);

      elements.push(
        <div
          key={msg.id}
          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-3 mb-0.5 ${showTail ? 'mb-2' : ''}`}
        >
          <div
            className={`max-w-[80%] px-3 py-2 text-sm leading-relaxed ${
              isOutbound
                ? 'bg-primary text-primary-foreground rounded-2xl rounded-br-md'
                : 'bg-muted rounded-2xl rounded-bl-md'
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
            <p className={`text-[10px] mt-1 text-right ${
              isOutbound ? 'text-primary-foreground/60' : 'text-muted-foreground'
            }`}>
              {formatMessageTime(msg.created_at)}
            </p>
          </div>
        </div>
      );
    });

    return elements;
  };

  if (isNewConversation) {
    return (
      <div className="flex flex-col h-full">
        <NewConversationHeader
          onBack={() => navigate(`/number/${numberId}`)}
          onSelectContact={handleNewConversation}
          fromNumber={currentNumber?.phone_number || ''}
        />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/number/${numberId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="flex-1 min-w-0" onClick={() => setEditingContact(true)}>
            <h1 className="text-base font-semibold truncate cursor-pointer">
              {conversation?.contact_name || formatPhone(conversation?.contact_number || '')}
            </h1>
            {conversation?.contact_name && (
              <p className="text-xs text-muted-foreground truncate">
                {formatPhone(conversation.contact_number)}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-md hover:bg-accent hover:text-accent-foreground">
              <MoreVertical className="h-5 w-5" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingContact(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Contact Name
              </DropdownMenuItem>
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (activeConvId && confirm('Delete this conversation?')) {
                    deleteConvMutation.mutate(activeConvId);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete Conversation
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {editingContact && conversation && (
        <div className="border-b border-border bg-muted/30 px-4 py-3 max-w-lg mx-auto w-full">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateContactMutation.mutate({ id: conversation.id, name: contactName });
            }}
            className="flex gap-2"
          >
            <Input
              autoFocus
              placeholder="Contact name"
              value={contactName}
              onChange={(e) => setContactName(e.target.value)}
              className="flex-1 h-9"
            />
            <Button type="submit" size="sm" disabled={updateContactMutation.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" onClick={() => setEditingContact(false)}>
              Cancel
            </Button>
          </form>
        </div>
      )}

      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain py-2"
      >
        <div className="max-w-lg mx-auto w-full">
          {messagesLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3, 4].map(i => (
                <div key={i} className={`flex ${i % 2 === 0 ? 'justify-end' : 'justify-start'} px-3`}>
                  <Skeleton className={`h-12 ${i % 2 === 0 ? 'w-48' : 'w-56'} rounded-2xl`} />
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            renderMessages(messages)
          ) : (
            <div className="flex flex-col items-center justify-center h-32 text-center">
              <p className="text-sm text-muted-foreground">No messages yet. Say hello!</p>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background border-t border-border safe-area-bottom">
        <div className="max-w-lg mx-auto w-full px-3 py-2">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-end gap-2"
          >
            <div className="flex-1 relative">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                className="pr-3 rounded-full h-10 bg-muted/50 border-0 focus-visible:ring-1"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-10 w-10 shrink-0"
              disabled={!message.trim() || sendMutation.isPending || !activeConvId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
