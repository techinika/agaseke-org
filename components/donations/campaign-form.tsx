'use client';

import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { CampaignFormFields, CampaignSubmitData } from './campaign-form-fields';
import { Campaign } from '@/types/campaign';

interface CampaignFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CampaignSubmitData) => Promise<void>;
  editingCampaign?: Campaign | null;
}

export function CampaignForm({ open, onOpenChange, onSubmit, editingCampaign }: CampaignFormProps) {

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingCampaign ? 'Edit Campaign' : 'Create Campaign'}</DialogTitle>
          <DialogDescription>
            {editingCampaign ? 'Update your donation campaign.' : 'Launch a new donation campaign with a goal and deadline.'}
          </DialogDescription>
        </DialogHeader>
        <CampaignFormFields
          defaultValues={editingCampaign ? {
            title: editingCampaign.title,
            description: editingCampaign.description,
            goalAmount: editingCampaign.goalAmount,
            endDate: editingCampaign.endDate?.toDate().toISOString().split('T')[0] ?? '',
            platformFeePayer: editingCampaign.platformFeePayer,
          } : undefined}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
          submitLabel={editingCampaign ? 'Save changes' : 'Create campaign'}
          submittingLabel={editingCampaign ? 'Saving...' : 'Creating...'}
        />
      </DialogContent>
    </Dialog>
  );
}
