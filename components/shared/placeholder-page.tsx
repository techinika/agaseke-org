import { LucideIcon, Construction } from 'lucide-react';
import { PageHeader } from './page-header';
import { EmptyState } from './empty-state';

interface PlaceholderPageProps {
  title: string;
  description: string;
  icon?: LucideIcon;
}

export function PlaceholderPage({ title, description, icon = Construction }: PlaceholderPageProps) {
  return (
    <div className="space-y-8">
      <PageHeader title={title} description={description} />
      <EmptyState
        icon={icon}
        title="Coming soon"
        description="This feature is being built and will be available in the next update."
      />
    </div>
  );
}
