'use client';

import { Campaign } from '@/types/campaign';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2, EyeOff, CheckCircle2, Calendar, Target, Percent } from 'lucide-react';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { CURRENCY, PLATFORM_FEE_RATE } from '@/lib/constants';

interface CampaignCardProps {
  campaign: Campaign;
  onEdit: (campaign: Campaign) => void;
  onToggleActive: (campaign: Campaign) => void;
  onDelete: (campaign: Campaign) => void;
}

export function CampaignCard({ campaign, onEdit, onToggleActive, onDelete }: CampaignCardProps) {
  const progress = campaign.goalAmount > 0
    ? Math.min(Math.round((campaign.raisedAmount / campaign.goalAmount) * 100), 100)
    : 0;

  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold truncate">{campaign.title}</h3>
              {!campaign.isActive && (
                <Badge variant="outline" className="text-xs shrink-0">
                  <EyeOff className="mr-1 size-3" />
                  Inactive
                </Badge>
              )}
            </div>
            <p className="mt-1 text-sm text-muted-foreground line-clamp-2">{campaign.description}</p>
          </div>
          <div className="flex shrink-0 gap-1">
            <Button variant="ghost" size="icon-xs" onClick={() => onEdit(campaign)}>
              <Pencil className="size-4" />
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => onToggleActive(campaign)}>
              {campaign.isActive ? <EyeOff className="size-4" /> : <CheckCircle2 className="size-4 text-success" />}
            </Button>
            <Button variant="ghost" size="icon-xs" onClick={() => onDelete(campaign)} className="text-destructive hover:text-destructive">
              <Trash2 className="size-4" />
            </Button>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Target className="size-4" />
            <span>
              {campaign.raisedAmount.toLocaleString()} / {campaign.goalAmount.toLocaleString()} {CURRENCY}
            </span>
          </div>
          <div className="flex items-center gap-1">
            <Calendar className="size-4" />
            <span>
              {format(campaign.startDate.toDate(), 'MMM d')}
              {campaign.endDate ? ` - ${format(campaign.endDate.toDate(), 'MMM d, yyyy')}` : ' - Ongoing'}
            </span>
          </div>
          <Badge variant={campaign.platformFeePayer === 'org' ? 'secondary' : 'default'} className="text-xs">
            <Percent className="mr-1 size-3" />
            Fee: {campaign.platformFeePayer === 'org' ? 'Org pays' : 'Donor adds'} {Math.round(PLATFORM_FEE_RATE * 100)}%
          </Badge>
        </div>

        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all', progress >= 100 ? 'bg-success' : 'bg-primary')}
            style={{ width: `${progress}%` }}
          />
        </div>
        <p className="mt-1 text-xs text-muted-foreground">{progress}% of goal raised</p>
      </CardContent>
    </Card>
  );
}
