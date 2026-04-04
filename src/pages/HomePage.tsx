import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, Phone, ChevronRight, Trash2, Pencil, MoreVertical, Settings } from 'lucide-react';
import { useState } from 'react';
import { api } from '@/lib/api';
import type { PhoneNumber } from '@/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AddNumberDialog } from '@/components/AddNumberDialog';
import { EditLabelDialog } from '@/components/EditLabelDialog';
import { PageTransition } from '@/components/PageTransition';
import { toast } from 'sonner';

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

function getCountryFlag(code: string) {
  const flags: Record<string, string> = {
    AU: '\u{1F1E6}\u{1F1FA}',
    US: '\u{1F1FA}\u{1F1F8}',
    GB: '\u{1F1EC}\u{1F1E7}',
    CA: '\u{1F1E8}\u{1F1E6}',
    NZ: '\u{1F1F3}\u{1F1FF}',
  };
  return flags[code] || '\u{1F30D}';
}

export function HomePage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [editingNumber, setEditingNumber] = useState<PhoneNumber | null>(null);

  const { data: numbers, isLoading } = useQuery({
    queryKey: ['numbers'],
    queryFn: api.numbers.list,
  });

  const deleteMutation = useMutation({
    mutationFn: api.numbers.delete,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['numbers'] });
      toast.success('Number released');
    },
    onError: (err: Error) => toast.error(err.message),
  });

  return (
    <PageTransition>
      <header className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl border-b border-border safe-area-top">
        <div className="flex items-center justify-between px-4 h-14 max-w-lg mx-auto w-full">
          <h1 className="text-lg font-semibold tracking-tight">Burner</h1>
          <div className="flex items-center gap-1">
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => navigate('/settings')}>
              <Settings className="h-5 w-5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-9 w-9" onClick={() => setAddDialogOpen(true)}>
              <Plus className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto overscroll-contain">
        <div className="max-w-lg mx-auto w-full">
          {isLoading ? (
            <div className="p-4 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-32 mb-2" />
                    <Skeleton className="h-3 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : numbers && numbers.length > 0 ? (
            <div className="divide-y divide-border">
              {numbers.map((num) => (
                <NumberRow
                  key={num.id}
                  number={num}
                  onTap={() => navigate(`/number/${num.id}`)}
                  onEdit={() => setEditingNumber(num)}
                  onDelete={() => {
                    if (confirm('Release this number? This action cannot be undone and will remove the number from your Twilio account.')) {
                      deleteMutation.mutate(num.id);
                    }
                  }}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-[70vh] px-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mb-5">
                <Phone className="h-10 w-10 text-primary" />
              </div>
              <h2 className="text-xl font-semibold mb-2">Get Started</h2>
              <p className="text-muted-foreground mb-8 max-w-xs leading-relaxed">
                Provision a temporary phone number to start sending and receiving SMS messages.
              </p>
              <Button size="lg" onClick={() => setAddDialogOpen(true)} className="gap-2 rounded-full px-6">
                <Plus className="h-4 w-4" /> Get a Number
              </Button>
            </div>
          )}
        </div>
      </main>

      <AddNumberDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
      <EditLabelDialog
        number={editingNumber}
        open={!!editingNumber}
        onOpenChange={(open) => !open && setEditingNumber(null)}
      />
    </PageTransition>
  );
}

function NumberRow({
  number,
  onTap,
  onEdit,
  onDelete,
}: {
  number: PhoneNumber;
  onTap: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      className="flex items-center gap-3 px-4 py-3.5 active:bg-muted/50 transition-colors cursor-pointer select-none"
      onClick={onTap}
    >
      <div className="w-12 h-12 rounded-full bg-linear-to-br from-primary/20 to-primary/5 flex items-center justify-center shrink-0 text-xl">
        {getCountryFlag(number.country_code)}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-[15px] truncate text-foreground">
            {number.label || formatPhone(number.phone_number)}
          </span>
          {number.unread_conversations && number.unread_conversations > 0 ? (
            <Badge className="h-5 min-w-5 px-1.5 text-xs rounded-full bg-primary text-primary-foreground">
              {number.unread_conversations}
            </Badge>
          ) : null}
        </div>
        {number.label && (
          <p className="text-[13px] text-muted-foreground truncate mt-0.5">
            {formatPhone(number.phone_number)}
          </p>
        )}
      </div>
      <DropdownMenu>
        <DropdownMenuTrigger
          onClick={(e) => e.stopPropagation()}
          className="shrink-0 inline-flex items-center justify-center h-8 w-8 rounded-full hover:bg-muted transition-colors"
        >
          <MoreVertical className="h-4 w-4 text-muted-foreground" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(); }}>
            <Pencil className="h-4 w-4 mr-2" /> Edit Label
          </DropdownMenuItem>
          <DropdownMenuItem
            variant="destructive"
            onClick={(e) => { e.stopPropagation(); onDelete(); }}
          >
            <Trash2 className="h-4 w-4 mr-2" /> Release Number
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <ChevronRight className="h-4 w-4 text-muted-foreground/50 shrink-0" />
    </div>
  );
}
