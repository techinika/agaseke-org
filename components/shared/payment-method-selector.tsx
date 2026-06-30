'use client';

import { Smartphone, CreditCard } from 'lucide-react';

interface PaymentMethodSelectorProps {
  value: 'mobile_money' | 'card';
  onChange: (value: 'mobile_money' | 'card') => void;
}

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Payment method</p>
      <div className="grid grid-cols-2 gap-3" role="radiogroup">
        <button
          type="button"
          role="radio"
          aria-checked={value === 'mobile_money'}
          onClick={() => onChange('mobile_money')}
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
            value === 'mobile_money'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <Smartphone className="size-5 shrink-0 text-muted-foreground" />
          <span>Mobile Money</span>
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={value === 'card'}
          onClick={() => onChange('card')}
          className={`flex items-center gap-2 rounded-lg border p-3 text-sm transition-all ${
            value === 'card'
              ? 'border-primary bg-primary/5 ring-1 ring-primary'
              : 'border-border hover:border-muted-foreground/30'
          }`}
        >
          <CreditCard className="size-5 shrink-0 text-muted-foreground" />
          <span>Bank Card</span>
        </button>
      </div>
    </div>
  );
}
