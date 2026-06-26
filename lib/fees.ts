import { PLATFORM_FEE_RATE, type PlatformFeePayer } from './constants';

export interface FeeBreakdown {
  totalToPay: number;
  platformFee: number;
  orgReceives: number;
}

export function calculateFee(amount: number, feePayer: PlatformFeePayer): FeeBreakdown {
  const feeRate = PLATFORM_FEE_RATE;
  if (feePayer === 'org') {
    const totalToPay = amount;
    const platformFee = Math.round(amount * feeRate);
    const orgReceives = amount - platformFee;
    return { totalToPay, platformFee, orgReceives };
  }
  const orgReceives = amount;
  const totalToPay = Math.ceil(amount / (1 - feeRate));
  const platformFee = totalToPay - orgReceives;
  return { totalToPay, platformFee, orgReceives };
}
