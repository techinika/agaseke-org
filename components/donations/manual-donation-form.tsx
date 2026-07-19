'use client';

import { useState } from 'react';
import { UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useCreateDonation } from '@/hooks/use-donations';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { useCampaigns } from '@/hooks/use-campaigns';
import { useOrganization } from '@/hooks/use-organization';
import { calculateFee } from '@/lib/fees';
import { CURRENCY, type SubscriptionPlan } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

interface ManualDonationFormProps {
  orgId: string;
  slug: string;
}

function generateId(): string {
  return crypto.randomUUID();
}

export function ManualDonationForm({ orgId, slug }: ManualDonationFormProps) {
  const [open, setOpen] = useState(false);
  const [donorName, setDonorName] = useState('');
  const [donorEmail, setDonorEmail] = useState('');
  const [amount, setAmount] = useState('');
  const [campaignId, setCampaignId] = useState('none');
  const [notes, setNotes] = useState('');

  const createDonation = useCreateDonation(orgId);
  const createTransaction = useCreateTransaction(orgId);
  const { data: campaigns } = useCampaigns(orgId);
  const { data: org } = useOrganization(orgId);

  const plan: SubscriptionPlan = org?.subscriptionPlan || 'starter';
  const amountNum = parseFloat(amount) || 0;
  const fees = amountNum > 0 ? calculateFee(amountNum, 'org', plan) : null;

  function resetForm() {
    setDonorName('');
    setDonorEmail('');
    setAmount('');
    setCampaignId('none');
    setNotes('');
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!donorName.trim() || amountNum <= 0) {
      toast.error('Please enter donor name and a valid amount');
      return;
    }

    const depositId = generateId();
    const now = Timestamp.now();

    try {
      await createDonation.mutateAsync({
        orgId,
        userId: null,
        donorName: donorName.trim(),
        donorEmail: donorEmail.trim() || null,
        amount: amountNum,
        platformFee: fees?.platformFee ?? 0,
        orgReceives: fees?.orgReceives ?? amountNum,
        campaignId: campaignId === 'none' ? null : campaignId,
        frequency: 'one_time',
        status: 'active',
        nextBillingDate: null,
        depositId,
        createdAt: now,
      });

      await createTransaction.mutateAsync({
        orgId,
        userId: null,
        amount: amountNum,
        platformFee: fees?.platformFee ?? 0,
        orgReceives: fees?.orgReceives ?? amountNum,
        currency: CURRENCY,
        type: 'donation',
        referenceId: depositId,
        depositId,
        status: 'completed',
        paymentMethod: 'manual',
        createdAt: now,
        processedAt: now.toDate().toISOString(),
      });

      toast.success(`Donation of ${CURRENCY} ${amountNum} registered from ${donorName}`);
      resetForm();
      setOpen(false);
    } catch {
      toast.error('Failed to register donation');
    }
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) resetForm(); }}>
      <DialogTrigger render={<Button variant="outline" />}>
        <UserPlus className="mr-2 size-4" />
        Register donation
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Register manual donation</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="donorName">Donor name *</Label>
            <Input
              id="donorName"
              value={donorName}
              onChange={(e) => setDonorName(e.target.value)}
              placeholder="Jane Smith"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="donorEmail">Donor email</Label>
            <Input
              id="donorEmail"
              type="email"
              value={donorEmail}
              onChange={(e) => setDonorEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount ({CURRENCY}) *</Label>
            <Input
              id="amount"
              type="number"
              min="1"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              required
            />
            {fees && (
              <p className="text-xs text-muted-foreground">
                Org receives {CURRENCY} {fees.orgReceives} (platform fee: {CURRENCY} {fees.platformFee})
              </p>
            )}
          </div>

          {campaigns && campaigns.length > 0 && (
            <div className="space-y-2">
              <Label>Campaign</Label>
              <Select value={campaignId} onValueChange={(v) => setCampaignId(v ?? 'none')}>
                <SelectTrigger>
                  <SelectValue placeholder="General fund" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">General fund</SelectItem>
                  {campaigns.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Optional notes about this donation..."
              rows={2}
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={createDonation.isPending || createTransaction.isPending || amountNum <= 0}>
              {createDonation.isPending ? 'Saving...' : 'Register donation'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
