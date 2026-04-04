import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { PhoneNumber } from '@/types';
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
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface Props {
  number: PhoneNumber | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditLabelDialog({ number, open, onOpenChange }: Props) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');

  useEffect(() => {
    if (number) setLabel(number.label);
  }, [number]);

  const mutation = useMutation({
    mutationFn: ({ id, label }: { id: number; label: string }) =>
      api.numbers.update(id, label),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Label updated');
      onOpenChange(false);
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm mx-auto">
        <DialogHeader>
          <DialogTitle>Edit Label</DialogTitle>
          <DialogDescription>
            Give this number a descriptive label.
          </DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (number) mutation.mutate({ id: number.id, label });
          }}
          className="space-y-4"
        >
          <div>
            <Label htmlFor="edit-label" className="mb-1.5 block text-sm">Label</Label>
            <Input
              id="edit-label"
              autoFocus
              placeholder="e.g. Business, Personal"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" disabled={mutation.isPending} className="flex-1">
              {mutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Save
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
