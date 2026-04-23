import { ArrowLeft, Send, Loader2 } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onBack: () => void;
  onSend: (phoneNumber: string, message: string) => void;
  fromNumber: string;
  isSending?: boolean;
}

function normalizePhone(raw: string): string {
  let number = raw.trim();
  if (!number) return '';
  if (!number.startsWith('+')) {
    if (number.startsWith('0')) {
      number = '+61' + number.slice(1);
    } else {
      number = '+' + number;
    }
  }
  return number;
}

export function NewConversationHeader({ onBack, onSend, fromNumber, isSending }: Props) {
  const [phone, setPhone] = useState('');
  const [message, setMessage] = useState('');
  const messageRef = useRef<HTMLInputElement>(null);

  const canSend = phone.trim().length > 0 && message.trim().length > 0 && !isSending;

  const handleSend = () => {
    const number = normalizePhone(phone);
    const text = message.trim();
    if (!number || !text) return;
    onSend(number, text);
  };

  useEffect(() => {
    if (phone.trim() && messageRef.current) {
      messageRef.current.focus();
    }
  }, []);

  return (
    <>
      <header className="absolute top-0 inset-x-0 z-20 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="flex items-center gap-1 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[15px] font-semibold">New Message</h1>
        </div>
      </header>

      <div className="h-full overflow-y-auto overscroll-contain pt-app-header pb-app-footer">
        <div className="max-w-lg mx-auto w-full px-4">
          <div className="pt-4 pb-2 border-b border-border">
            <div className="flex items-center gap-3">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider shrink-0">To</p>
              <Input
                autoFocus
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="flex-1 h-9 border-0 bg-transparent p-0 text-[15px] focus-visible:ring-0 shadow-none"
              />
            </div>
            <p className="text-[11px] text-muted-foreground mt-1.5 mb-1 leading-relaxed">
              Numbers starting with 0 get +61 automatically. International numbers need + country code.
            </p>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 inset-x-0 z-20 bg-background/80 backdrop-blur-xl border-t border-border safe-area-bottom">
        <div className="max-w-lg mx-auto w-full px-3 py-2">
          <form
            onSubmit={(e) => { e.preventDefault(); handleSend(); }}
            className="flex items-end gap-2"
          >
            <div className="flex-1">
              <Input
                ref={messageRef}
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
              disabled={!canSend}
            >
              {isSending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </Button>
          </form>
        </div>
      </div>
    </>
  );
}
