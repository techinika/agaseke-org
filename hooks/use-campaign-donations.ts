import { useQuery } from '@tanstack/react-query';
import { queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { Donation } from '@/types/donation';
import { where } from 'firebase/firestore';

export function useCampaignDonationTotals(orgId: string) {
  return useQuery({
    queryKey: ['campaign-donation-totals', orgId],
    queryFn: async () => {
      const donations = await queryDocuments<Donation>(
        COLLECTIONS.DONATIONS,
        where('orgId', '==', orgId)
      );
      const totals: Record<string, number> = {};
      for (const d of donations) {
        if (d.campaignId) {
          totals[d.campaignId] = (totals[d.campaignId] ?? 0) + d.amount;
        }
      }
      return totals;
    },
    enabled: !!orgId,
    staleTime: 30_000,
  });
}
