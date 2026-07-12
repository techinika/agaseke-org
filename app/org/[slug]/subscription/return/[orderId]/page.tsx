import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';
import { SubscriptionReturnClient } from './return-client';

export default async function SubscriptionReturnPage({ params }: { params: Promise<{ slug: string; orderId: string }> }) {
  const { slug, orderId } = await params;
  return (
    <Suspense fallback={<div className="flex items-center justify-center py-20"><Loader2 className="size-8 animate-spin" /></div>}>
      <SubscriptionReturnClient slug={slug} orderId={orderId} />
    </Suspense>
  );
}
