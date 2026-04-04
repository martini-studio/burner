import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, Send, MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { useState, useRef, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';
import type { Message } from '@/types';
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
import { PageTransition } from '@/components/PageTransition';

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

function formatMessageTime(dateStr: string) {
  const date = new Date(dateStr + 'Z');
  return format(date, 'HH:mm');
}

function formatDateSeparator(dateStr: string) {
  const date = new Date(dateStr + 'Z');
  if (isToday(date)) return 'Today';
  if (isYesterday(date)) return 'Yesterday';
  return format(date, 'EEEE, d MMMM');
}

export function ChatPage() {
  const { numberId, conversationId } = useParams<{ numberId: string; conversationId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [message, setMessage] = useState('');
  const [activeConvId, setActiveConvId] = useState<number | null>(
    conversationId ? Number(conversationId) : null
  );
  const [isNewConversation] = useState(!conversationId);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [editingContact, setEditingContact] = useState(false);
  const [contactName, setContactName] = useState('');
  const prevMessageCount = useRef(0);

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

  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: prevMessageCount.current > 0 ? 'smooth' : 'auto',
      });
    }
  }, []);

  useEffect(() => {
    if (messages) {
      scrollToBottom();
      prevMessageCount.current = messages.length;
    }
  }, [messages, scrollToBottom]);

  useEffect(() => {
    if (conversation) {
      setContactName(conversation.contact_name || '');
    }
  }, [conversation]);

  const handleSend = async () => {
    const text = message.trim();
    if (!text || !activeConvId) return;
    sendMutation.mutate({ convId: activeConvId, body: text });
  };

  const [newMsgSending, setNewMsgSending] = useState(false);

  const handleNewConversation = async (contactNumber: string, firstMessage: string) => {
    setNewMsgSending(true);
    try {
      const conv = await api.conversations.create(Number(numberId), contactNumber);
      await api.messages.send(conv.id, firstMessage);
      setActiveConvId(conv.id);
      queryClient.invalidateQueries({ queryKey: ['conversations', numberId] });
      queryClient.invalidateQueries({ queryKey: ['messages', conv.id] });
      navigate(`/number/${numberId}/chat/${conv.id}`, { replace: true });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setNewMsgSending(false);
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
          <div key={`date-${dateKey}`} className="flex justify-center my-3">
            <span className="text-[11px] font-medium text-muted-foreground bg-muted/60 backdrop-blur-sm px-3 py-1 rounded-full">
              {formatDateSeparator(msg.created_at)}
            </span>
          </div>
        );
        lastDate = dateKey;
      }

      const isOutbound = msg.direction === 'outbound';
      const nextMsg = msgs[i + 1];
      const isLastInGroup = !nextMsg ||
        nextMsg.direction !== msg.direction ||
        !isSameDay(new Date(nextMsg.created_at + 'Z'), msgDate);

      elements.push(
        <div
          key={msg.id}
          className={`flex ${isOutbound ? 'justify-end' : 'justify-start'} px-3 ${isLastInGroup ? 'mb-2.5' : 'mb-0.5'}`}
        >
          <div
            className={`max-w-[78%] px-3.5 py-2 text-[15px] leading-[1.4] shadow-sm ${
              isOutbound
                ? `bg-primary text-primary-foreground ${isLastInGroup ? 'rounded-[20px] rounded-br-[6px]' : 'rounded-[20px]'}`
                : `bg-muted text-foreground ${isLastInGroup ? 'rounded-[20px] rounded-bl-[6px]' : 'rounded-[20px]'}`
            }`}
          >
            <p className="whitespace-pre-wrap break-words">{msg.body}</p>
            <p className={`text-[10px] mt-0.5 text-right leading-none ${
              isOutbound ? 'text-primary-foreground/50' : 'text-muted-foreground/70'
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
      <PageTransition>
        <NewConversationHeader
          onBack={() => navigate(`/number/${numberId}`)}
          onSend={handleNewConversation}
          fromNumber={currentNumber?.phone_number || ''}
          isSending={newMsgSending}
        />
      </PageTransition>
    );
  }

  return (
    <PageTransition>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="flex items-center gap-1 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={() => navigate(`/number/${numberId}`)}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div
            className="flex-1 min-w-0 px-1 cursor-pointer"
            onClick={() => setEditingContact(true)}
          >
            <h1 className="text-[15px] font-semibold truncate">
              {conversation?.contact_name || formatPhone(conversation?.contact_number || '')}
            </h1>
            {conversation?.contact_name && (
              <p className="text-xs text-muted-foreground truncate">
                {formatPhone(conversation.contact_number)}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger className="inline-flex items-center justify-center h-9 w-9 rounded-full hover:bg-muted transition-colors">
              <MoreVertical className="h-5 w-5 text-muted-foreground" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setEditingContact(true)}>
                <Pencil className="h-4 w-4 mr-2" /> Edit Contact
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  if (activeConvId && confirm('Delete this conversation?')) {
                    deleteConvMutation.mutate(activeConvId);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      {editingContact && conversation && (
        <div className="border-b border-border bg-muted/30 backdrop-blur-sm px-4 py-3 max-w-lg mx-auto w-full">
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
              className="flex-1 h-9 rounded-full"
            />
            <Button type="submit" size="sm" className="rounded-full" disabled={updateContactMutation.isPending}>
              Save
            </Button>
            <Button type="button" size="sm" variant="ghost" className="rounded-full" onClick={() => setEditingContact(false)}>
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
                  <Skeleton className={`h-10 ${i % 2 === 0 ? 'w-44' : 'w-52'} rounded-[20px]`} />
                </div>
              ))}
            </div>
          ) : messages && messages.length > 0 ? (
            renderMessages(messages)
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <p className="text-sm text-muted-foreground">Send your first message</p>
            </div>
          )}
        </div>
      </div>

      <div className="sticky bottom-0 bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="max-w-lg mx-auto w-full px-3 py-2">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Input
                ref={inputRef}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Message..."
                className="rounded-full h-10 bg-muted/60 border-0 focus-visible:ring-1 focus-visible:ring-primary/30 px-4 text-[15px]"
              />
            </div>
            <Button
              type="submit"
              size="icon"
              className="rounded-full h-10 w-10 shrink-0 shadow-sm"
              disabled={!message.trim() || sendMutation.isPending || !activeConvId}
            >
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      </div>
    </PageTransition>
  );
}
