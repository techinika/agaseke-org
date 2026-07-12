'use client';

import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { WORKERS } from '@/lib/workers';

interface SubscriptionReturnClientProps {
  slug: string;
  orderId: string;
}

export function SubscriptionReturnClient({ slug, orderId }: SubscriptionReturnClientProps) {
  const router = useRouter();
  const [status, setStatus] = useState<'checking' | 'success' | 'failed' | 'processing'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [finalized, setFinalized] = useState(false);
  const pollRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cancelledRef = useRef(false);

  useEffect(() => {
    if (!orderId || finalized) return;

    cancelledRef.current = false;
    let pollCount = 0;
    const MAX_POLL = 12;

    async function checkAndFinalize() {
      try {
        const res = await fetch(`${WORKERS.payments.url}/finalize`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-API-Key': WORKERS.payments.apiKey,
          },
          body: JSON.stringify({ depositId: orderId }),
        });
        const data = await res.json();

        if (cancelledRef.current) return;

        if (data.status === 'completed') {
          setStatus('success');
          setFinalized(true);
          return;
        }

        if (data.status === 'failed') {
          setStatus('failed');
          setErrorMessage(data.failureReason || 'Payment was declined.');
          setFinalized(true);
          return;
        }

        if (data.status === 'not_found') {
          setStatus('failed');
          setErrorMessage('Payment session expired or not found.');
          setFinalized(true);
          return;
        }

        setStatus('processing');
        pollCount++;
        if (pollCount < MAX_POLL) {
          pollRef.current = setTimeout(checkAndFinalize, 5000);
        } else {
          setFinalized(true);
        }
      } catch {
        if (!cancelledRef.current) {
          setStatus('processing');
          pollCount++;
          if (pollCount < MAX_POLL) {
            pollRef.current = setTimeout(checkAndFinalize, 5000);
          } else {
            setFinalized(true);
          }
        }
      }
    }

    checkAndFinalize();

    return () => {
      cancelledRef.current = true;
      if (pollRef.current) clearTimeout(pollRef.current);
    };
  }, [orderId, finalized]);

  return (
    <div className="mx-auto max-w-lg px-4 py-12">
      {status === 'checking' && (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-muted">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
            <CardTitle className="text-xl">Verifying payment</CardTitle>
            <CardDescription>Please wait while we confirm your subscription payment...</CardDescription>
          </CardHeader>
        </Card>
      )}

      {status === 'success' && (
        <Card className="text-center">
          <CardHeader>
            <div className="mx-auto mb-4 flex size-16 items-center justify-center rounded-full bg-success/10">
              <CheckCircle2 className="size-8 text-success" />
            </div>
            <CardTitle className="text-xl">Subscription payment successful!</CardTitle>
            <CardDescription>Your plan has been updated.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Thank you for subscribing. Your new plan is now active.
            </p>
            <Button onClick={() => router.push(`/org/${slug}/subscription`)}>
              Back to subscription
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
              Your payment is being processed. This usually takes a few minutes.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button onClick={() => router.push(`/org/${slug}/subscription`)}>
              Back to subscription
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
            <p className="text-sm text-muted-foreground">Please try again or use a different payment method.</p>
            <div className="flex gap-3 justify-center">
              <Button variant="outline" onClick={() => router.push(`/org/${slug}/subscription`)}>
                <ArrowLeft className="mr-2 size-4" />
                Try again
              </Button>
              <Button onClick={() => router.push(`/org/${slug}/dashboard`)}>
                Go to dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
