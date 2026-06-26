'use client';

import { Tier } from '@/types/membership';
import { TierFormFields, TierFormData } from '@/components/members/tier-form-fields';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';

interface TierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TierFormData) => Promise<void>;
  editingTier?: Tier | null;
}

export function TierForm({ open, onOpenChange, onSubmit, editingTier }: TierFormProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingTier ? 'Edit Tier' : 'Create Tier'}</DialogTitle>
          <DialogDescription>
            {editingTier ? 'Update the membership tier details.' : 'Add a new membership tier for your organization.'}
          </DialogDescription>
        </DialogHeader>
        <TierFormFields
          key={editingTier?.id ?? 'new'}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={editingTier ? 'Save changes' : 'Create tier'}
          submittingLabel={editingTier ? 'Saving...' : 'Creating...'}
          defaultValues={
            editingTier
              ? {
                  name: editingTier.name,
                  description: editingTier.description,
                  price: editingTier.price,
                  billingCycle: editingTier.billingCycle,
                  benefits: editingTier.benefits,
                  platformFeePayer: editingTier.platformFeePayer,
                }
              : undefined
          }
        />
      </DialogContent>
    </Dialog>
  );
}
