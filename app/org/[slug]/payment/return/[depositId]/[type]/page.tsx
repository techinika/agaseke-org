'use client';

import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { CheckCircle2, XCircle, Loader2, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { updateDocument, queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { Transaction } from '@/types/transaction';
import { Donation } from '@/types/donation';
import { Membership } from '@/types/membership';
import { increment, where } from 'firebase/firestore';

export default function PaymentReturnPage() {
  const { slug, depositId, type } = useParams<{ slug: string; depositId: string; type: string }>();
  const router = useRouter();
  const { data: org } = useOrganizationBySlug(slug);

  const [status, setStatus] = useState<'checking' | 'success' | 'failed'>('checking');
  const [errorMessage, setErrorMessage] = useState('');
  const [finalized, setFinalized] = useState(false);
  const [paymentType, setPaymentType] = useState<'donation' | 'membership'>('donation');

  useEffect(() => {
    if (type === 'donation' || type === 'membership') {
      setPaymentType(type);
    }
  }, [type]);

  useEffect(() => {
    if (!depositId || finalized) return;

    async function checkAndFinalize() {
      try {
        const res = await fetch(`/api/payments/status?depositId=${depositId}`);
        const data = await res.json();

        if (data.status === 'NOT_FOUND') {
          setStatus('failed');
          setErrorMessage('Payment session expired or not found.');
          setFinalized(true);
          return;
        }

        const deposit = data.deposit;

        if (deposit.status === 'COMPLETED') {
          const txs = await queryDocuments<Transaction>(
            COLLECTIONS.TRANSACTIONS,
            where('depositId', '==', depositId)
          );

          for (const tx of txs) {
            await updateDocument(`${COLLECTIONS.TRANSACTIONS}/${tx.id}`, { status: 'completed' });

            if (paymentType === 'donation') {
              const donations = await queryDocuments<Donation>(
                COLLECTIONS.DONATIONS,
                where('depositId', '==', depositId)
              );
              for (const donation of donations) {
                await updateDocument(`${COLLECTIONS.DONATIONS}/${donation.id}`, { status: 'active' });

                if (donation.campaignId) {
                  await updateDocument(
                    `${COLLECTIONS.ORGANIZATIONS}/${donation.orgId}/${SUBCOLLECTIONS.CAMPAIGNS}/${donation.campaignId}`,
                    { raisedAmount: increment(donation.orgReceives) }
                  );
                }
              }
            }

            if (paymentType === 'membership') {
              const memberships = await queryDocuments<Membership>(
                COLLECTIONS.MEMBERSHIPS,
                where('depositId', '==', depositId)
              );
              for (const membership of memberships) {
                await updateDocument(`${COLLECTIONS.MEMBERSHIPS}/${membership.id}`, { status: 'active' });
                await updateDocument(
                  `${COLLECTIONS.ORGANIZATIONS}/${membership.orgId}/${SUBCOLLECTIONS.MEMBERS}/${membership.userId}`,
                  { status: 'active' }
                );
              }
            }
          }

          setStatus('success');
        } else if (deposit.status === 'FAILED') {
          const txs = await queryDocuments<Transaction>(
            COLLECTIONS.TRANSACTIONS,
            where('depositId', '==', depositId)
          );
          for (const tx of txs) {
            await updateDocument(`${COLLECTIONS.TRANSACTIONS}/${tx.id}`, { status: 'failed' });
          }

          setStatus('failed');
          setErrorMessage(deposit.failureReason?.failureMessage || 'Payment was declined.');
        } else {
          setStatus('success');
        }
      } catch (err) {
        console.error('Payment verification error:', err);
        setStatus('success');
      } finally {
        setFinalized(true);
      }
    }

    checkAndFinalize();
  }, [depositId, finalized, paymentType]);

  if (!org) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
      <PublicOrgHeader org={org} slug={slug} />
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
      <PublicOrgFooter orgName={org.name} />
    </div>
  );
}
