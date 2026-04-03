import { ArrowLeft, Send } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onBack: () => void;
  onSelectContact: (phoneNumber: string) => void;
  fromNumber: string;
}

function formatPhone(phone: string) {
  if (phone.startsWith('+61')) {
    const local = phone.slice(3);
    return `+61 ${local.slice(0, 1)} ${local.slice(1, 5)} ${local.slice(5)}`;
  }
  return phone;
}

export function NewConversationHeader({ onBack, onSelectContact, fromNumber }: Props) {
  const [phone, setPhone] = useState('');

  const handleSubmit = () => {
    let number = phone.trim();
    if (!number) return;

    if (!number.startsWith('+')) {
      if (number.startsWith('0')) {
        number = '+61' + number.slice(1);
      } else {
        number = '+' + number;
      }
    }
    onSelectContact(number);
  };

  return (
    <>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="flex items-center gap-1 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" className="h-9 w-9" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-[15px] font-semibold">New Message</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-6 flex-1">
        <div className="space-y-6">
          <div className="bg-muted/30 rounded-2xl p-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">From</p>
            <p className="text-[15px] font-medium">{formatPhone(fromNumber)}</p>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">To</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                type="tel"
                placeholder="Phone number"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1 h-11 rounded-xl text-[15px]"
              />
              <Button
                onClick={handleSubmit}
                disabled={!phone.trim()}
                size="icon"
                className="h-11 w-11 rounded-xl shrink-0"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-3 leading-relaxed">
              Australian numbers starting with 0 will automatically get the +61 prefix.
              For international numbers, include the full number with + country code.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
