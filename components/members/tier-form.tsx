'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Loader2, Plus, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Tier } from '@/types/membership';
import { BillingCycle, PlatformFeePayer } from '@/lib/constants';

const tierSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  price: z.coerce.number().min(1, 'Price must be at least 1'),
  billingCycle: z.enum(['monthly', 'annual', 'one_time'] as const),
  benefits: z.array(z.string()).min(1, 'At least one benefit is required'),
  platformFeePayer: z.enum(['org', 'donor']),
});

type TierFormData = z.infer<typeof tierSchema>;

interface TierFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: TierFormData) => Promise<void>;
  editingTier?: Tier | null;
}

function TierFormInner({ open, onOpenChange, onSubmit, editingTier }: TierFormProps) {
  const initialBenefits = editingTier?.benefits?.length ? editingTier.benefits : [''];
  const [benefits, setBenefits] = useState<string[]>(initialBenefits);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<TierFormData>({
    resolver: zodResolver(tierSchema),
    defaultValues: {
      name: editingTier?.name ?? '',
      description: editingTier?.description ?? '',
      price: editingTier?.price ?? 0,
      billingCycle: editingTier?.billingCycle ?? 'monthly',
      platformFeePayer: editingTier?.platformFeePayer ?? 'org',
      benefits: initialBenefits,
    },
  });

  const platformFeePayer = watch('platformFeePayer');
  const price = watch('price');

  function addBenefit() {
    setBenefits([...benefits, '']);
  }

  function removeBenefit(index: number) {
    if (benefits.length === 1) return;
    setBenefits(benefits.filter((_, i) => i !== index));
  }

  function updateBenefit(index: number, value: string) {
    const updated = [...benefits];
    updated[index] = value;
    setBenefits(updated);
  }

  async function onFormSubmit(data: TierFormData) {
    const filtered = benefits.filter((b) => b.trim().length > 0);
    if (filtered.length === 0) return;
    setIsSubmitting(true);
    await onSubmit({ ...data, benefits: filtered, platformFeePayer: data.platformFeePayer });
    setIsSubmitting(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{editingTier ? 'Edit Tier' : 'Create Tier'}</DialogTitle>
          <DialogDescription>
            {editingTier ? 'Update the membership tier details.' : 'Add a new membership tier for your organization.'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Tier name</Label>
            <Input id="name" placeholder="e.g. Gold Member" {...register('name')} />
            {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea id="description" placeholder="What does this tier include?" rows={3} {...register('description')} />
            {errors.description && <p className="text-xs text-destructive">{errors.description.message}</p>}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="price">Price ($)</Label>
              <Input id="price" type="number" min={1} {...register('price')} />
              {errors.price && <p className="text-xs text-destructive">{errors.price.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Billing cycle</Label>
              <Select
                defaultValue={editingTier?.billingCycle || 'monthly'}
                onValueChange={(v) => v && setValue('billingCycle', v as BillingCycle)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select cycle" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="monthly">Monthly</SelectItem>
                  <SelectItem value="annual">Annual</SelectItem>
                  <SelectItem value="one_time">One time</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="platformFeePayer">Platform fee payer</Label>
            <p className="text-xs text-muted-foreground">
              Agaseke charges a 10% platform fee. Choose who pays it.
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
                    {price > 0
                      ? `You receive ${price.toLocaleString()} USD, platform deducts ${(price * 0.1).toLocaleString()} USD`
                      : 'Fee deducted from payout'}
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
                    {price > 0
                      ? `Donor pays ${(price * 1.1).toLocaleString()} USD, you receive ${price.toLocaleString()} USD`
                      : '10% added to checkout'}
                  </p>
                </div>
              </label>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Benefits</Label>
            <div className="space-y-2">
              {benefits.map((benefit, index) => (
                <div key={index} className="flex gap-2">
                  <Input
                    value={benefit}
                    onChange={(e) => updateBenefit(index, e.target.value)}
                    placeholder="e.g. Access to premium rooms"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-xs"
                    onClick={() => removeBenefit(index)}
                    disabled={benefits.length === 1}
                  >
                    <X className="size-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button type="button" variant="outline" size="sm" onClick={addBenefit} className="mt-2">
              <Plus className="mr-2 size-4" />
              Add benefit
            </Button>
            {errors.benefits && <p className="text-xs text-destructive">{errors.benefits.message}</p>}
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
              {editingTier ? 'Save changes' : 'Create tier'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function TierForm(props: TierFormProps) {
  return <TierFormInner key={props.editingTier?.id ?? 'new'} {...props} />;
}
