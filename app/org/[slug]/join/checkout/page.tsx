'use client';

import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, CheckCircle2, Smartphone, CreditCard, Users } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { OrgNotFound } from '@/components/shared/org-not-found';
import { BrandColorWrapper } from '@/components/shared/brand-color-wrapper';
import { PaymentMethodSelector } from '@/components/shared/payment-method-selector';
import type { PaymentMethod } from '@/components/shared/payment-method-selector';
import { useActiveTiers } from '@/hooks/use-tiers';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useCreateMembership } from '@/hooks/use-memberships';
import { CURRENCY, COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { calculateFee } from '@/lib/fees';
import { addDocument, setDocument } from '@/lib/firebase/firestore';
import { generateDepositId, convertToRwf, getReturnUrl } from '@/lib/pawapay';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

export default function CheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, profile } = useAuthStore();
  const tierId = searchParams.get('tierId');

  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: tiers, isLoading: tiersLoading } = useActiveTiers(org?.id ?? '');
  const createMembership = useCreateMembership(org?.id ?? '');

  const tier = useMemo(() => tiers?.find((t) => t.id === tierId), [tiers, tierId]);

  const feePayer = tier?.platformFeePayer ?? 'org';

  const feeBreakdown = useMemo(() => {
    if (!tier) return null;
    return calculateFee(tier.price, feePayer);
  }, [tier, feePayer]);

  const [isProcessing, setIsProcessing] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('mobile_money');

  function PageLayout({ children }: { children: React.ReactNode }) {
    if (!org) return <>{children}</>;
    return (
      <BrandColorWrapper org={org}>
        <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
          <PublicOrgHeader org={org} slug={slug} />
          {children}
          <PublicOrgFooter orgName={org.name} />
        </div>
      </BrandColorWrapper>
    );
  }

  async function handlePayment() {
    if (!user || !org || !tier) return;
    setIsProcessing(true);
    const depositId = generateDepositId();
    let membershipId: string | null = null;
    try {
      const now = Timestamp.now();
      const totalToPay = feeBreakdown!.totalToPay;
      const rwfAmount = convertToRwf(totalToPay);
      const returnUrl = getReturnUrl(slug, depositId, 'membership');

      const renewsAt = tier.billingCycle === 'monthly'
        ? new Timestamp(now.seconds + 30 * 24 * 3600, 0)
        : tier.billingCycle === 'annual'
          ? new Timestamp(now.seconds + 365 * 24 * 3600, 0)
          : now;

      membershipId = await createMembership.mutateAsync({
        orgId: org.id,
        userId: user.uid,
        tierId: tier.id,
        status: 'pending',
        startDate: now,
        renewsAt,
        autoRenew: true,
        createdAt: now,
      });

      await setDocument(`${COLLECTIONS.ORGANIZATIONS}/${org.id}/${SUBCOLLECTIONS.MEMBERS}/${user.uid}`, {
        userId: user.uid,
        membershipId,
        tierId: tier.id,
        status: 'pending',
        depositId,
        joinedAt: now,
        displayName: profile?.displayName || user.displayName || 'Member',
        photoURL: profile?.photoURL || user.photoURL,
      });

      const pm = paymentMethod === 'card' ? 'pesapal' : 'pawapay';

      const txData: Record<string, unknown> = {
        orgId: org.id,
        userId: user.uid,
        amount: totalToPay,
        platformFee: feeBreakdown!.platformFee,
        orgReceives: feeBreakdown!.orgReceives,
        currency: 'RWF',
        type: 'membership',
        referenceId: depositId,
        depositId,
        status: 'pending',
        paymentMethod: pm,
        createdAt: now,
      };

      await addDocument(COLLECTIONS.TRANSACTIONS, txData);

      if (paymentMethod === 'card') {
        const res = await fetch('/api/payments/initiate-card', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositId,
            amount: rwfAmount,
            returnUrl,
            reason: `Membership ${tier.name} for ${org.name}`,
            email: user.email || profile?.email,
            firstName: profile?.displayName || user.displayName || 'Member',
            lastName: org.name,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to initiate card payment');
        }

        const { redirectUrl } = await res.json();
        window.location.href = redirectUrl;
      } else {
        const res = await fetch('/api/payments/initiate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            depositId,
            amount: rwfAmount,
            returnUrl,
            reason: `Membership ${tier.name} for ${org.name}`,
          }),
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error || 'Failed to initiate payment');
        }

        const { redirectUrl } = await res.json();
        window.location.href = redirectUrl;
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Payment initiation failed');
      setIsProcessing(false);
    }
  }

  if (!user) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Card>
            <CardHeader className="text-center">
              <CardTitle>Sign in required</CardTitle>
              <CardDescription>You need to sign in to complete your membership.</CardDescription>
            </CardHeader>
            <CardFooter className="justify-center">
              <Button onClick={() => router.push(`/auth/login?redirect=/org/${slug}/join`)}>
                Sign in
              </Button>
            </CardFooter>
          </Card>
        </div>
      </PageLayout>
    );
  }

  if (orgLoading || tiersLoading) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!org) {
    return <OrgNotFound icon={Users} />;
  }

  if (!tier) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-12 text-center">
          <h2 className="text-xl font-bold">Tier not found</h2>
          <p className="mt-2 text-muted-foreground">This membership tier doesn&apos;t exist.</p>
          <Button variant="outline" className="mt-4" onClick={() => router.push(`/org/${slug}/join`)}>
            <ArrowLeft className="mr-2 size-4" />
            Back to tiers
          </Button>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-1 border-b bg-muted/30 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Complete your membership</CardTitle>
            <CardDescription>Join {org.name} as a {tier.name} member</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">{tier.name}</p>
                  <p className="text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-bold">
                    {feeBreakdown?.totalToPay.toLocaleString()} {CURRENCY}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {feeBreakdown ? convertToRwf(feeBreakdown.totalToPay).toLocaleString() : '0'} RWF
                    {tier.billingCycle !== 'one_time' && ` /${tier.billingCycle}`}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {tier.benefits.map((b, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    <CheckCircle2 className="mr-1 size-3 text-success" />
                    {b}
                  </Badge>
                ))}
              </div>
            </div>

            <Separator />

            <div>
              <p className="mb-3 text-sm font-medium">Select payment method</p>
              <PaymentMethodSelector value={paymentMethod} onChange={setPaymentMethod} />
            </div>
          </CardContent>
          <div className="flex flex-col gap-3 border-t p-4 sm:flex-row sm:p-6">
            <Button
              variant="outline"
              className="order-2 sm:order-1"
              onClick={() => router.push(`/org/${slug}/join`)}
            >
              <ArrowLeft className="mr-2 size-4" />
              Choose tier
            </Button>
            <Button
              className="order-1 flex-1 sm:order-2"
              size="lg"
              disabled={isProcessing}
              onClick={handlePayment}
            >
              {isProcessing ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : paymentMethod === 'card' ? (
                <CreditCard className="mr-2 size-4" />
              ) : (
                <Smartphone className="mr-2 size-4" />
              )}
              Pay {feeBreakdown?.totalToPay.toLocaleString()} {CURRENCY}
            </Button>
          </div>
        </Card>
      </div>
    </PageLayout>
  );
}
