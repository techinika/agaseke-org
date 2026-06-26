import { Smartphone, CreditCard } from 'lucide-react';

export type PaymentMethod = 'mobile_money' | 'card';

interface PaymentMethodSelectorProps {
  value: PaymentMethod;
  onChange: (method: PaymentMethod) => void;
}

const OPTIONS: { value: PaymentMethod; label: string; icon: typeof Smartphone; description: string }[] = [
  {
    value: 'mobile_money',
    label: 'Mobile Money',
    icon: Smartphone,
    description: 'Pay with MTN MoMo, Airtel Money, or other mobile money providers via pawaPay.',
  },
  {
    value: 'card',
    label: 'Bank Card',
    icon: CreditCard,
    description: 'Pay with Visa, Mastercard, or other bank cards via PesaPal.',
  },
];

export function PaymentMethodSelector({ value, onChange }: PaymentMethodSelectorProps) {
  return (
    <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Payment method">
      {OPTIONS.map((opt) => {
        const Icon = opt.icon;
        const isSelected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={isSelected}
            onClick={() => onChange(opt.value)}
            className={`flex flex-col items-center gap-2 rounded-lg border p-4 text-center transition-all ${
              isSelected
                ? 'border-primary bg-primary/5 ring-1 ring-primary'
                : 'border-border bg-card hover:border-muted-foreground/30'
            }`}
          >
            <Icon className={`size-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
            <div>
              <p className={`text-sm font-medium ${isSelected ? 'text-primary' : ''}`}>{opt.label}</p>
              <p className="mt-1 text-xs text-muted-foreground">{opt.description}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}
