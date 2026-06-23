'use client';

import { Tier } from '@/types/membership';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { GripVertical, Pencil, Trash2, EyeOff, CheckCircle2, DollarSign, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CURRENCY, PLATFORM_FEE_RATE } from '@/lib/constants';

interface TierCardProps {
  tier: Tier;
  onEdit: (tier: Tier) => void;
  onToggleActive: (tier: Tier) => void;
  onDelete: (tier: Tier) => void;
  dragHandleProps?: Record<string, unknown>;
  isDragging?: boolean;
}

export function TierCard({ tier, onEdit, onToggleActive, onDelete, dragHandleProps, isDragging }: TierCardProps) {
  return (
    <Card className={cn('relative', isDragging && 'opacity-50 shadow-lg')}>
      <CardContent className="flex items-center gap-4 p-4">
        <div className="cursor-grab text-muted-foreground hover:text-foreground" {...dragHandleProps}>
          <GripVertical className="size-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-semibold">{tier.name}</span>
            {!tier.isActive && (
              <Badge variant="outline" className="text-xs text-muted-foreground">
                <EyeOff className="mr-1 size-3" />
                Inactive
              </Badge>
            )}
          </div>
          <p className="mt-0.5 text-sm text-muted-foreground line-clamp-1">{tier.description}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Badge variant="secondary" className="text-xs">
              <DollarSign className="mr-1 size-3" />
              {tier.price.toLocaleString()} {CURRENCY}/{tier.billingCycle === 'one_time' ? 'once' : tier.billingCycle}
            </Badge>
            <Badge variant={tier.platformFeePayer === 'org' ? 'secondary' : 'default'} className="text-xs">
              <Percent className="mr-1 size-3" />
              Fee: {tier.platformFeePayer === 'org' ? 'Org pays' : 'Member adds'} {Math.round(PLATFORM_FEE_RATE * 100)}%
            </Badge>
            {tier.benefits.map((b, i) => (
              <Badge key={i} variant="outline" className="text-xs">
                <CheckCircle2 className="mr-1 size-3 text-success" />
                {b}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <Button variant="ghost" size="icon-xs" onClick={() => onEdit(tier)}>
            <Pencil className="size-4" />
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onToggleActive(tier)}>
            {tier.isActive ? <EyeOff className="size-4" /> : <CheckCircle2 className="size-4 text-success" />}
          </Button>
          <Button variant="ghost" size="icon-xs" onClick={() => onDelete(tier)} className="text-destructive hover:text-destructive">
            <Trash2 className="size-4" />
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
