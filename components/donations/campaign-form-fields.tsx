'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { PlatformFeePayer } from '@/lib/constants';

const campaignSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  goalAmount: z.coerce.number().min(100, 'Goal must be at least $100'),
  endDate: z.string().optional(),
  platformFeePayer: z.enum(['org', 'donor']),
});

type CampaignFormData = z.infer<typeof campaignSchema>;

export interface CampaignSubmitData {
  title: string;
  description: string;
  goalAmount: number;
  endDate: string | null;
  platformFeePayer: PlatformFeePayer;
}

interface CampaignFormFieldsProps {
  defaultValues?: Partial<CampaignFormData>;
  onSubmit: (data: CampaignSubmitData) => Promise<void>;
  onCancel: () => void;
  submitLabel: string;
  submittingLabel: string;
}

export function CampaignFormFields({ defaultValues, onSubmit, onCancel, submitLabel, submittingLabel }: CampaignFormFieldsProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CampaignFormData>({
    resolver: zodResolver(campaignSchema),
    defaultValues: {
      title: '',
      description: '',
      goalAmount: 0,
      endDate: '',
      platformFeePayer: 'org',
      ...defaultValues,
    },
  });

  const goalAmount = watch('goalAmount');
  const descriptionValue = watch('description');

  async function onFormSubmit(data: CampaignFormData) {
    setIsSubmitting(true);
    await onSubmit({
      title: data.title,
      description: data.description,
      goalAmount: data.goalAmount,
      endDate: data.endDate ?? null,
      platformFeePayer: data.platformFeePayer,
    });
    setIsSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="title">Campaign title</Label>
        <Input id="title" placeholder="e.g. School Building Fund" {...register('title')} />
        {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
      </div>
      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <RichTextEditor
          value={descriptionValue}
          onChange={(html) => setValue('description', html, { shouldValidate: true })}
          placeholder="Tell donors what this campaign supports..."
          minHeight="200px"
        />
        {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="goalAmount">Goal amount ($)</Label>
          <Input id="goalAmount" type="number" min={100} {...register('goalAmount')} />
          {errors.goalAmount && <p className="text-xs text-destructive">{errors.goalAmount.message}</p>}
        </div>
        <div className="space-y-2">
          <Label htmlFor="endDate">End date (optional)</Label>
          <Input id="endDate" type="date" {...register('endDate')} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Platform fee payer</Label>
        <p className="text-xs text-muted-foreground">
          Quorum charges a 10% platform fee. Choose who pays it.
        </p>
        <div className="flex gap-4">
          <label className="flex items-center gap-2 rounded-lg border p-3 flex-1 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              value="org"
              {...register('platformFeePayer')}
              className="accent-primary"
            />
            <div>
              <span className="text-sm font-medium">Organization pays</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {goalAmount > 0
                  ? `You receive ${(goalAmount * 0.9).toLocaleString()} USD, platform deducts ${(goalAmount * 0.1).toLocaleString()} USD`
                  : 'Fee deducted from donations'}
              </p>
            </div>
          </label>
          <label className="flex items-center gap-2 rounded-lg border p-3 flex-1 cursor-pointer has-[:checked]:border-primary has-[:checked]:bg-primary/5">
            <input
              type="radio"
              value="donor"
              {...register('platformFeePayer')}
              className="accent-primary"
            />
            <div>
              <span className="text-sm font-medium">Donor pays</span>
              <p className="text-xs text-muted-foreground mt-0.5">
                {goalAmount > 0
                  ? `Donor pays ${Math.ceil(goalAmount / 0.9).toLocaleString()} USD, you receive ${goalAmount.toLocaleString()} USD`
                  : '10% added at checkout'}
              </p>
            </div>
          </label>
        </div>
      </div>
      <div className="flex justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
          {isSubmitting ? submittingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}
