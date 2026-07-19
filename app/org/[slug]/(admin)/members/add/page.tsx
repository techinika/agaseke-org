'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useTiers } from '@/hooks/use-tiers';
import { useCreateMembership } from '@/hooks/use-memberships';
import { useCreateOrgMember } from '@/hooks/use-members';
import { useCreateTransaction } from '@/hooks/use-transactions';
import { useOrganization } from '@/hooks/use-organization';
import { calculateFee } from '@/lib/fees';
import { CURRENCY, type SubscriptionPlan } from '@/lib/constants';
import { Timestamp } from 'firebase/firestore';
import { toast } from 'sonner';

function generateId(): string {
  return crypto.randomUUID();
}

export default function AddMemberPage() {
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;

  const { data: org } = useOrganization(slug);
  const orgId = org?.id ?? '';
  const { data: tiers, isLoading: tiersLoading } = useTiers(orgId);
  const createMembership = useCreateMembership(orgId);
  const createOrgMember = useCreateOrgMember(orgId);
  const createTransaction = useCreateTransaction(orgId);

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [selectedTierId, setSelectedTierId] = useState('');
  const [isPaid, setIsPaid] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const plan: SubscriptionPlan = org?.subscriptionPlan || 'starter';
  const selectedTier = tiers?.find((t) => t.id === selectedTierId);
  const amountNum = parseFloat(amount) || 0;
  const fees = isPaid && amountNum > 0 ? calculateFee(amountNum, 'org', plan) : null;

  const activeTiers = tiers?.filter((t) => t.isActive) ?? [];

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!displayName.trim() || !selectedTierId) {
      toast.error('Please enter a name and select a tier');
      return;
    }
    if (isPaid && amountNum <= 0) {
      toast.error('Please enter a valid amount');
      return;
    }

    setLoading(true);
    try {
      const membershipId = generateId();
      const now = Timestamp.now();
      const userId = `manual_${Date.now()}`;

      // Create membership record
      await createMembership.mutateAsync({
        orgId,
        userId,
        tierId: selectedTierId,
        status: 'active',
        amount: isPaid ? amountNum : 0,
        startDate: now,
        renewsAt: null,
        autoRenew: false,
        depositId: isPaid ? generateId() : undefined,
        createdAt: now,
      });

      // Create org member record
      await createOrgMember.mutateAsync({
        userId,
        membershipId,
        tierId: selectedTierId,
        status: 'active',
        joinedAt: now,
        displayName: displayName.trim(),
        photoURL: null,
      });

      // Create transaction if paid
      if (isPaid && amountNum > 0) {
        const depositId = generateId();
        await createTransaction.mutateAsync({
          orgId,
          userId,
          amount: amountNum,
          platformFee: fees?.platformFee ?? 0,
          orgReceives: fees?.orgReceives ?? amountNum,
          currency: CURRENCY,
          type: 'membership',
          referenceId: membershipId,
          depositId,
          status: 'completed',
          paymentMethod: 'manual',
          createdAt: now,
          processedAt: now.toDate().toISOString(),
        });
      }

      toast.success(`Added ${displayName} as a member`);
      router.push(`/org/${slug}/members`);
    } catch {
      toast.error('Failed to add member');
    } finally {
      setLoading(false);
    }
  }

  if (tiersLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (activeTiers.length === 0) {
    return (
      <div className="space-y-6">
        <Button variant="ghost" size="sm" onClick={() => router.push(`/org/${slug}/members`)} className="-ml-2">
          <ArrowLeft className="mr-2 size-4" />
          Back to members
        </Button>
        <Card>
          <CardContent className="pt-6 text-center">
            <p className="text-muted-foreground mb-4">No active tiers available. Create a tier first.</p>
            <Button onClick={() => router.push(`/org/${slug}/members/tiers/new`)}>
              Create a tier
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/org/${slug}/members`)}
          className="mb-2 -ml-2"
        >
          <ArrowLeft className="mr-2 size-4" />
          Back to members
        </Button>
        <h1 className="text-2xl font-bold">Add member manually</h1>
        <p className="text-muted-foreground">Register a member without requiring online payment</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Member Details</CardTitle>
          <CardDescription>Enter the member&apos;s information</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="displayName">Full name *</Label>
                <Input
                  id="displayName"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="Jane Smith"
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Tier *</Label>
              <Select value={selectedTierId} onValueChange={(v) => setSelectedTierId(v ?? '')}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a tier" />
                </SelectTrigger>
                <SelectContent>
                  {activeTiers.map((tier) => (
                    <SelectItem key={tier.id} value={tier.id}>
                      {tier.name} — ${tier.price}/{tier.billingCycle === 'annual' ? 'year' : 'month'}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border p-4">
              <div className="space-y-0.5">
                <Label>Has this member paid?</Label>
                <p className="text-sm text-muted-foreground">
                  Toggle on if the member has already paid via an external method
                </p>
              </div>
              <Button
                type="button"
                variant={isPaid ? 'default' : 'outline'}
                size="sm"
                onClick={() => setIsPaid(!isPaid)}
              >
                {isPaid ? 'Paid' : 'Unpaid'}
              </Button>
            </div>

            {isPaid && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount paid ({CURRENCY}) *</Label>
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
            )}

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => router.push(`/org/${slug}/members`)}>
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={loading || !displayName.trim() || !selectedTierId}
              >
                {loading ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : (
                  <UserPlus className="mr-2 size-4" />
                )}
                Add member
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
