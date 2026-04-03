import { ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface Props {
  onBack: () => void;
  onSelectContact: (phoneNumber: string) => void;
  fromNumber: string;
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
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border">
        <div className="flex items-center gap-2 px-2 h-14 max-w-lg mx-auto w-full">
          <Button variant="ghost" size="icon" onClick={onBack}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-base font-semibold">New Message</h1>
        </div>
      </header>

      <div className="max-w-lg mx-auto w-full px-4 py-4">
        <div className="space-y-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">From</p>
            <p className="text-sm font-medium">{fromNumber}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">To</p>
            <div className="flex gap-2">
              <Input
                autoFocus
                type="tel"
                placeholder="Phone number (e.g. 0412345678)"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
                className="flex-1"
              />
              <Button onClick={handleSubmit} disabled={!phone.trim()}>
                Start
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Australian numbers starting with 0 will automatically get +61 prefix.
              For international numbers, include the + country code.
            </p>
          </div>
        </div>
      </div>
    </>
  );
}
