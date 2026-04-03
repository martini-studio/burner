import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import { Phone, MapPin, Loader2 } from 'lucide-react';
import type { AvailableNumber } from '@/types';

const COUNTRIES = [
  { code: 'AU', name: 'Australia', flag: '\u{1F1E6}\u{1F1FA}' },
  { code: 'US', name: 'United States', flag: '\u{1F1FA}\u{1F1F8}' },
  { code: 'GB', name: 'United Kingdom', flag: '\u{1F1EC}\u{1F1E7}' },
  { code: 'CA', name: 'Canada', flag: '\u{1F1E8}\u{1F1E6}' },
  { code: 'NZ', name: 'New Zealand', flag: '\u{1F1F3}\u{1F1FF}' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddNumberDialog({ open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [country, setCountry] = useState('AU');
  const [selectedNumber, setSelectedNumber] = useState<string | null>(null);
  const [label, setLabel] = useState('');
  const [step, setStep] = useState<'select' | 'confirm'>('select');

  const { data: availableNumbers, isLoading, error, refetch } = useQuery({
    queryKey: ['available-numbers', country],
    queryFn: () => api.numbers.available(country),
    enabled: open,
  });

  const provisionMutation = useMutation({
    mutationFn: ({ phoneNumber, label }: { phoneNumber: string; label: string }) =>
      api.numbers.provision(phoneNumber, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number provisioned!');
      handleClose();
    },
    onError: (err: Error) => toast.error(err.message),
  });

  const handleClose = () => {
    setStep('select');
    setSelectedNumber(null);
    setLabel('');
    onOpenChange(false);
  };

  const handleProvision = () => {
    if (!selectedNumber) return;
    provisionMutation.mutate({ phoneNumber: selectedNumber, label });
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md mx-auto max-h-[85dvh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {step === 'select' ? 'Get a Number' : 'Confirm Number'}
          </DialogTitle>
          <DialogDescription>
            {step === 'select'
              ? 'Choose a country and pick an available number.'
              : 'Give your new number a label to identify it.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'select' ? (
          <div className="flex flex-col gap-4 flex-1 min-h-0">
            <div>
              <Label className="mb-1.5 block text-sm">Country</Label>
              <Select value={country} onValueChange={(val) => { if (val) setCountry(val); setSelectedNumber(null); }}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {COUNTRIES.map(c => (
                    <SelectItem key={c.code} value={c.code}>
                      <span className="mr-2">{c.flag}</span> {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto -mx-2 px-2">
              {isLoading ? (
                <div className="space-y-2">
                  {[1, 2, 3, 4, 5].map(i => (
                    <Skeleton key={i} className="h-14 w-full rounded-lg" />
                  ))}
                </div>
              ) : error ? (
                <div className="text-center py-8">
                  <p className="text-sm text-destructive mb-3">Failed to load numbers</p>
                  <Button variant="outline" size="sm" onClick={() => refetch()}>
                    Retry
                  </Button>
                </div>
              ) : availableNumbers && availableNumbers.length > 0 ? (
                <div className="space-y-1.5">
                  {availableNumbers.map((num) => (
                    <button
                      key={num.phoneNumber}
                      onClick={() => setSelectedNumber(num.phoneNumber)}
                      className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                        selectedNumber === num.phoneNumber
                          ? 'bg-primary/10 ring-2 ring-primary'
                          : 'bg-muted/30 hover:bg-muted/60'
                      }`}
                    >
                      <Phone className="h-4 w-4 text-muted-foreground shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{num.phoneNumber}</p>
                        {num.locality && (
                          <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                            <MapPin className="h-3 w-3" /> {num.locality}{num.region ? `, ${num.region}` : ''}
                          </p>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-sm text-muted-foreground">No numbers available for this country.</p>
                </div>
              )}
            </div>

            <Button
              onClick={() => setStep('confirm')}
              disabled={!selectedNumber}
              className="w-full"
            >
              Continue
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="bg-muted/50 rounded-lg p-4 text-center">
              <p className="text-lg font-semibold">{selectedNumber}</p>
            </div>

            <div>
              <Label htmlFor="label" className="mb-1.5 block text-sm">Label (optional)</Label>
              <Input
                id="label"
                placeholder="e.g. Business, Personal, Temp"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>

            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep('select')} className="flex-1">
                Back
              </Button>
              <Button
                onClick={handleProvision}
                disabled={provisionMutation.isPending}
                className="flex-1"
              >
                {provisionMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Get Number
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
