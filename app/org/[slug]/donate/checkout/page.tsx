'use client';

import { useState, useMemo } from 'react';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { Loader2, ArrowLeft, Smartphone, CreditCard, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { OrgNotFound } from '@/components/shared/org-not-found';
import { BrandColorWrapper } from '@/components/shared/brand-color-wrapper';
import { PaymentMethodSelector } from '@/components/shared/payment-method-selector';
import type { PaymentMethod } from '@/components/shared/payment-method-selector';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useCampaigns } from '@/hooks/use-campaigns';
import { CURRENCY, COLLECTIONS } from '@/lib/constants';
import { calculateFee } from '@/lib/fees';
import { addDocument } from '@/lib/firebase/firestore';
import { generateDepositId, convertToRwf, getReturnUrl } from '@/lib/pawapay';
import { toast } from 'sonner';
import { Timestamp } from 'firebase/firestore';

export default function DonationCheckoutPage() {
  const { slug } = useParams<{ slug: string }>();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuthStore();

  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const { data: campaigns } = useCampaigns(org?.id ?? '');

  const campaignId = searchParams.get('campaignId') || '';
  const campaign = useMemo(() => campaigns?.find((c) => c.id === campaignId), [campaigns, campaignId]);
  const feePayer = campaign?.platformFeePayer ?? 'org';

  const amount = parseInt(searchParams.get('amount') || '0');

  const feeBreakdown = useMemo(() => {
    if (!amount) return null;
    return calculateFee(amount, feePayer);
  }, [amount, feePayer]);
  const frequency = (searchParams.get('frequency') || 'one_time') as string;
  const donorName = searchParams.get('donorName') || 'Anonymous';
  const donorEmail = searchParams.get('donorEmail') || '';
  const message = searchParams.get('message') || '';

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

  async function handlePay() {
    if (!org || amount < 100 || !feeBreakdown) return;
    setIsProcessing(true);
    const depositId = generateDepositId();
    let donationId: string | null = null;
    try {
      const now = Timestamp.now();
      const totalToPay = feeBreakdown.totalToPay;
      const orgReceives = feeBreakdown.orgReceives;
      const rwfAmount = convertToRwf(totalToPay);
      const returnUrl = getReturnUrl(slug, depositId, 'donation');

      donationId = await addDocument(COLLECTIONS.DONATIONS, {
        orgId: org.id,
        userId: user?.uid ?? null,
        donorName,
        donorEmail: donorEmail || null,
        campaignId: campaignId || null,
        amount: totalToPay,
        platformFee: feeBreakdown.platformFee,
        orgReceives,
        frequency,
        status: 'pending',
        depositId,
        nextBillingDate: frequency !== 'one_time'
          ? new Timestamp(now.seconds + (frequency === 'monthly' ? 30 : 365) * 86400, 0)
          : null,
        createdAt: now,
      });

      const pm = paymentMethod === 'card' ? 'pesapal' : 'pawapay';

      const txData: Record<string, unknown> = {
        orgId: org.id,
        userId: user?.uid ?? null,
        amount: totalToPay,
        platformFee: feeBreakdown.platformFee,
        orgReceives,
        currency: 'RWF',
        type: 'donation',
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
            reason: `Donation to ${org.name}${campaignId ? ` for ${campaign?.title || 'campaign'}` : ''}`,
            email: donorEmail || user?.email || undefined,
            firstName: donorName || 'Supporter',
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
            reason: `Donation to ${org.name}${campaignId ? ` for ${campaign?.title || 'campaign'}` : ''}`,
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

  if (orgLoading) {
    return (
      <PageLayout>
        <div className="mx-auto max-w-lg px-4 py-12">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </PageLayout>
    );
  }

  if (!org) {
    return <OrgNotFound icon={Heart} />;
  }

  return (
    <PageLayout>
      <div className="mx-auto w-full max-w-lg px-4 py-8 sm:py-12">
        <Card className="overflow-hidden">
          <CardHeader className="space-y-1 border-b bg-muted/30 pb-4 sm:pb-6">
            <CardTitle className="text-lg sm:text-xl">Complete your donation</CardTitle>
            <CardDescription>To {org.name}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6 p-4 sm:p-6">
            <div className="rounded-lg border bg-muted/50 p-4">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-semibold">
                    {frequency === 'one_time' ? 'One-time donation' : `${frequency === 'monthly' ? 'Monthly' : 'Annual'} donation`}
                  </p>
                  {campaignId && <p className="text-xs text-muted-foreground">Campaign donation</p>}
                </div>
                <div className="text-left sm:text-right">
                  <p className="text-xl font-bold">
                    {feeBreakdown?.totalToPay.toLocaleString()} {CURRENCY}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    ≈ {feeBreakdown ? convertToRwf(feeBreakdown.totalToPay).toLocaleString() : '0'} RWF
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                <Badge variant="outline" className="text-xs">{donorName}</Badge>
                {message && <Badge variant="outline" className="max-w-40 truncate text-xs">"{message}"</Badge>}
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
              onClick={() => router.push(`/org/${slug}/donate`)}
            >
              <ArrowLeft className="mr-2 size-4" />
              Edit donation
            </Button>
            <Button
              className="order-1 flex-1 sm:order-2"
              size="lg"
              disabled={isProcessing}
              onClick={handlePay}
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
