import Link from 'next/link';
import { ArrowRight, Users, Heart, MessageSquare, Shield, LayoutDashboard, CreditCard, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicNav } from '@/components/shared/public-nav';
import { PublicFooter } from '@/components/shared/public-footer';

const features = [
  {
    title: 'Manage Members',
    description: 'Create membership plans with different prices and benefits. See who your members are and what they get.',
    icon: Users,
  },
  {
    title: 'Collect Donations',
    description: 'Accept one-time or monthly donations. Create campaigns with goals and track progress in real time.',
    icon: Heart,
  },
  {
    title: 'Group Chat',
    description: 'Private chat rooms for your members. Control who can see and join each room.',
    icon: MessageSquare,
  },
  {
    title: 'Control Access',
    description: 'Give different permissions to admins, members, and donors. Keep some content for members only.',
    icon: Shield,
  },
  {
    title: 'Dashboard & Reports',
    description: 'See your numbers at a glance. Track members, donations, and money coming in each month.',
    icon: LayoutDashboard,
  },
  {
    title: 'Accept Payments',
    description: 'Take payments by mobile money or card. Set up recurring billing for memberships.',
    icon: CreditCard,
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        <section className="relative overflow-hidden py-24 sm:py-32 lg:py-40">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/15 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent" />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-8 inline-flex items-center gap-2 rounded-full border bg-muted/50 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                <span className="size-2 rounded-full bg-success" />
                For nonprofits and community groups in Africa
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                We help you manage members and donations with{' '}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">Agaseke</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                A simple platform for nonprofits, churches, schools, and associations to manage memberships,
                collect donations, and stay connected with their community.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="lg" className="h-13 px-8 text-base shadow-md transition-all hover:shadow-lg">
                    Create your organization
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <Link href="/auth/login">
                  <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                    Sign in
                  </Button>
                </Link>
              </div>
              <div className="mt-12 flex items-center justify-center gap-8 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> No credit card needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-success" /> Mobile Money & cards</span>
              </div>
            </div>
          </div>
        </section>

        <section id="features" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Simple tools to run your organization, from member signups to donation tracking.
              </p>
            </div>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {features.map((feature) => (
                <div
                  key={feature.title}
                  className="group relative overflow-hidden rounded-xl border bg-card p-6 transition-all hover:shadow-lg hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 -z-10 bg-gradient-to-br from-primary/[0.03] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
                  <div className="mb-5 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                    <feature.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-gradient-to-b from-muted/50 to-background py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-2xl border bg-card p-8 sm:p-12 lg:p-16 shadow-sm">
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5">
                    <Heart className="size-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Ready to get started?</h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Join thousands of organizations using Agaseke to manage their members and collect donations.
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                    <Link href="/auth/signup">
                      <Button size="lg" className="h-13 px-8 text-base shadow-md">
                        Create your organization
                        <ArrowRight className="ml-2 size-4" />
                      </Button>
                    </Link>
                    <Link href="/auth/login">
                      <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                        Sign in
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <PublicFooter />
    </div>
  );
}
