'use client';

import { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Room } from '@/types/room';
import { Tier } from '@/types/membership';

interface CreateRoomDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) => Promise<void>;
  isSubmitting: boolean;
  editingRoom?: Room | null;
  tiers?: Tier[];
}

export function CreateRoomDialog({
  open,
  onOpenChange,
  onSubmit,
  isSubmitting,
  editingRoom,
  tiers = [],
}: CreateRoomDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<Room['type']>('general');
  const [allowedTierIds, setAllowedTierIds] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      if (editingRoom) {
        setName(editingRoom.name);
        setDescription(editingRoom.description);
        setType(editingRoom.type);
        setAllowedTierIds(editingRoom.allowedTierIds ?? []);
      } else {
        reset();
      }
    }
  }, [open, editingRoom]);

  function reset() {
    setName('');
    setDescription('');
    setType('general');
    setAllowedTierIds([]);
  }

  function toggleTier(tierId: string) {
    setAllowedTierIds((prev) =>
      prev.includes(tierId) ? prev.filter((id) => id !== tierId) : [...prev, tierId]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    await onSubmit({
      name: name.trim(),
      description: description.trim(),
      type,
      allowedTierIds: type === 'tier_restricted' ? allowedTierIds : [],
    });
    if (!editingRoom) reset();
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (!open) reset();
        onOpenChange(open);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{editingRoom ? 'Edit chat room' : 'Create chat room'}</DialogTitle>
            <DialogDescription>
              {editingRoom ? 'Update room settings and access permissions.' : 'Create a new room for members to communicate.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="room-name">Room name</Label>
              <Input
                id="room-name"
                placeholder="e.g. announcements"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-desc">Description (optional)</Label>
              <Textarea
                id="room-desc"
                placeholder="What is this room for?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="room-type">Room type</Label>
              <Select
                value={type}
                onValueChange={(v) => {
                  setType(v as Room['type']);
                  if (v !== 'tier_restricted') setAllowedTierIds([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select room type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="general">General — visible to everyone</SelectItem>
                  <SelectItem value="members_only">Members only — active members</SelectItem>
                  <SelectItem value="tier_restricted">
                    Tier restricted — specific tiers
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {type === 'tier_restricted' && (
              <div className="space-y-2">
                <Label>Allowed membership tiers</Label>
                {tiers.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No tiers available. Create membership tiers first.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tiers.map((tier) => (
                      <button
                        key={tier.id}
                        type="button"
                        onClick={() => toggleTier(tier.id)}
                        className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                          allowedTierIds.includes(tier.id)
                            ? 'border-primary bg-primary text-primary-foreground'
                            : 'border-input hover:border-primary/50 hover:bg-primary/5'
                        }`}
                      >
                        {tier.name}
                      </button>
                    ))}
                  </div>
                )}
                {allowedTierIds.length === 0 && (
                  <p className="text-xs text-muted-foreground">Select at least one tier to restrict access.</p>
                )}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!name.trim() || isSubmitting || (type === 'tier_restricted' && allowedTierIds.length === 0)}
            >
              {isSubmitting ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : null}
              {editingRoom ? 'Save changes' : 'Create room'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
