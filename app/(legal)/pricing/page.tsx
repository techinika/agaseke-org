import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Check, HelpCircle, MessageSquare, Users, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicNav } from '@/components/shared/public-nav';
import { PublicFooter } from '@/components/shared/public-footer';
import { logger } from '@/lib/logger';

export const metadata: Metadata = {
  title: 'Pricing',
  description: 'Quorum. Simple, transparent pricing for organizations of all sizes.',
};

const tiers = [
  {
    name: 'Starter',
    price: 'Free',
    period: '',
    description: 'For small communities getting started',
    memberLimit: 'Up to 500 members',
    transactionFee: '10%',
    highlight: false,
    features: [
      'Unlimited admin users',
      'Membership tier management',
      'Donation campaigns',
      'Chat rooms (public & private)',
      'Payment processing (cards)',
      'Dashboard & reports',
      'White-labeled pages (logo, colors)',
      'Public organization page',
      'Email notifications',
    ],
    cta: 'Start free',
    ctaHref: '/auth/signup',
  },
  {
    name: 'Growth',
    price: '$99',
    period: '/month',
    description: 'For growing organizations with 500+ members',
    memberLimit: '500 – 1,000 members',
    transactionFee: '5%',
    highlight: true,
    features: [
      'Everything in Starter',
      'Lower 5% transaction fee',
      'Priority support',
      'Advanced analytics',
      'Custom email domain (SMTP)',
      'Bank payout settings',
      'Up to 1,000 members',
    ],
    cta: 'Get started',
    ctaHref: '/auth/signup',
  },
  {
    name: 'Enterprise',
    price: '$199',
    period: '/month',
    description: 'For large organizations with 1,000+ members',
    memberLimit: '1,000+ members',
    transactionFee: '5%',
    highlight: false,
    features: [
      'Everything in Growth',
      'Lower 5% transaction fee',
      'Dedicated account manager',
      'Custom integrations',
      'Bulk member import',
      'SLA guarantee',
    ],
    cta: 'Contact sales',
    ctaHref: '/#contact',
  },
];

const faqs = [
  {
    q: 'Is there a free plan?',
    a: 'Yes! The Starter plan is completely free for organizations with up to 500 members. You only pay the 10% platform fee on transactions.',
  },
  {
    q: 'How does the transaction fee work?',
    a: 'Starter plan has a 10% fee on donations and memberships. Growth and Enterprise plans reduce this to 5%. You choose whether your organization pays the fee or passes it to the donor.',
  },
  {
    q: 'What counts as a member?',
    a: 'A member is anyone who has an active membership in your organization. Donors who do not have a membership are not counted toward your member limit.',
  },
  {
    q: 'When do I start paying the subscription?',
    a: 'You only start paying when your active member count exceeds 500. The transaction fee applies to all plans from day one.',
  },
  {
    q: 'Can I switch plans at any time?',
    a: 'Yes. You can upgrade or downgrade your plan at any time. Changes take effect immediately and billing is prorated.',
  },
  {
    q: 'What payment methods do you accept?',
    a: 'We accept Visa, Mastercard, and other major credit cards through our secure payment processor PesaPal.',
  },
  {
    q: 'Is there a contract or commitment?',
    a: 'No. All plans are month-to-month with no long-term contracts. Cancel anytime from your organization settings.',
  },
];

export default function PricingPage() {
  logger.info('page:pricing', 'Rendering Pricing page');
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />

      <main className="flex-1">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </div>

          <div className="mx-auto max-w-3xl text-center">
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Simple, transparent pricing
            </h1>
            <p className="mt-4 text-lg text-muted-foreground">
              Start free. Pay only when you grow. All plans include white-labeled pages and payment processing.
            </p>
          </div>
        </div>

        <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 lg:px-8">
          <div className="grid gap-8 lg:grid-cols-3">
            {tiers.map((tier) => (
              <div
                key={tier.name}
                className={`relative flex flex-col rounded-2xl border bg-card p-8 transition-all ${
                  tier.highlight
                    ? 'border-primary shadow-lg ring-1 ring-primary/20 scale-[1.02]'
                    : 'hover:shadow-md'
                }`}
              >
                {tier.highlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-primary px-4 py-1 text-xs font-semibold text-primary-foreground">
                    Most popular
                  </div>
                )}
                <div className="mb-6">
                  <h3 className="text-xl font-semibold">{tier.name}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{tier.description}</p>
                </div>
                <div className="mb-6">
                  <span className="text-4xl font-bold">{tier.price}</span>
                  {tier.period && (
                    <span className="text-muted-foreground">{tier.period}</span>
                  )}
                </div>
                <div className="mb-2 rounded-lg bg-muted/50 px-4 py-2 text-center text-sm font-medium">
                  <Users className="mr-1.5 inline size-4 text-muted-foreground" />
                  {tier.memberLimit}
                </div>
                <div className="mb-2 rounded-lg bg-primary/10 px-4 py-2 text-center text-sm font-medium text-primary">
                  {tier.transactionFee} transaction fee
                </div>
                <ul className="mb-8 mt-4 flex-1 space-y-3">
                  {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-3 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-primary" />
                      <span>{feature}</span>
                    </li>
                  ))}
                </ul>
                <Link href={tier.ctaHref}>
                  <Button
                    className="w-full"
                    variant={tier.highlight ? 'default' : 'outline'}
                    size="lg"
                  >
                    {tier.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                What is included in all plans
              </h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-3">
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <Zap className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold">White-labeled pages</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Your logo, your colors, your brand. No Quorum branding on your public page.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <Users className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold">Unlimited admins</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Add as many administrators as you need. No extra charges for team members.
                </p>
              </div>
              <div className="flex flex-col items-center text-center">
                <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-primary/10">
                  <MessageSquare className="size-6 text-primary" />
                </div>
                <h3 className="font-semibold">Chat rooms</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Public, private, and tier-restricted rooms. End-to-end encrypted messages.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div id="faq" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Pricing questions
              </h2>
            </div>
            <div className="mx-auto max-w-3xl space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border bg-card transition-all open:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-sm font-medium list-none">
                    {faq.q}
                    <HelpCircle className="size-4 shrink-0 text-muted-foreground" />
                  </summary>
                  <div className="border-t px-6 py-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </div>

        <div className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Ready to get started?
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Create your organization in minutes. No credit card required for the Starter plan.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="lg" className="h-13 px-8 text-base">
                    Start free
                  </Button>
                </Link>
                <Link href="/#contact">
                  <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                    Contact sales
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </main>

      <PublicFooter />
    </div>
  );
}
