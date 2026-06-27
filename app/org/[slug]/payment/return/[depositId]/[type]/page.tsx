'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Clock, CreditCard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { OrgCheckoutLayout } from '@/components/shared/org-checkout-layout';
import { OrgNotFound } from '@/components/shared/org-not-found';
import { useOrganizationBySlug } from '@/hooks/use-organization';

export default function PaymentReturnPage() {
  const { slug, depositId, type } = useParams<{ slug: string; depositId: string; type: string }>();
  const router = useRouter();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);

  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'processing'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [finalized, setFinalized] = useState(false);
  const paymentType = type === 'membership' ? 'membership' : 'donation';

  useEffect(() => {
    if (!depositId || finalized) return;

    async function checkAndFinalize() {
      try {
        const res = await fetch('/api/payments/finalize', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ depositId, type: paymentType }),
        });
        const data = await res.json();

        if (data.status === 'completed') {
          setStatus('success');
        } else if (data.status === 'failed') {
          setStatus('failed');
          setErrorMessage(data.failureReason || 'Payment was declined.');
        } else if (data.status === 'not_found') {
          setStatus('failed');
          setErrorMessage('Payment session expired or not found.');
        } else {
          setStatus('processing');
        }
      } catch {
        setStatus('processing');
      } finally {
        setFinalized(true);
      }
    }

    checkAndFinalize();
  }, [depositId, finalized, paymentType]);

  if (orgLoading) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12">
        <Skeleton className="h-96 rounded-xl" />
      </div>
    );
  }

  if (!org) {
    return <OrgNotFound icon={CreditCard} />;
  }

  return (
    <OrgCheckoutLayout org={org} slug={slug}>
      <div className="mx-auto max-w-lg px-4 py-12">
        {status === 'checking' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Loader2 className="size-8 animate-spin text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Verifying payment</CardTitle>
              <CardDescription>
                Please wait while we confirm your payment...
              </CardDescription>
            </CardHeader>
          </Card>
        )}

        {status === 'success' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
                <CheckCircle2 className="size-8 text-success" />
              </div>
              <CardTitle className="text-xl">Payment successful!</CardTitle>
              <CardDescription>
                {paymentType === 'donation'
                  ? 'Thank you for your generous donation.'
                  : 'Welcome! Your membership is now active.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {org.name} greatly appreciates your support.
              </p>
              <Button onClick={() => router.push(`/org/${slug}`)}>
                Back to {org.name}
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'processing' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
                <Clock className="size-8 text-muted-foreground" />
              </div>
              <CardTitle className="text-xl">Payment processing</CardTitle>
              <CardDescription>
                Your payment is being processed. This usually takes a few minutes. Check back shortly.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button onClick={() => router.push(`/org/${slug}`)}>
                Back to {org.name}
              </Button>
            </CardContent>
          </Card>
        )}

        {status === 'failed' && (
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-destructive/10">
                <XCircle className="size-8 text-destructive" />
              </div>
              <CardTitle className="text-xl">Payment failed</CardTitle>
              <CardDescription>{errorMessage || 'Something went wrong with your payment.'}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Please try again or use a different payment method.
              </p>
              <div className="flex gap-3 justify-center">
                <Button
                  variant="outline"
                  onClick={() => router.push(`/org/${slug}/${paymentType === 'donation' ? 'donate' : 'join'}`)}
                >
                  <ArrowLeft className="mr-2 size-4" />
                  Try again
                </Button>
                <Button onClick={() => router.push(`/org/${slug}`)}>
                  Back to {org.name}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </OrgCheckoutLayout>
  );
}
