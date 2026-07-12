import Link from 'next/link';
import { ArrowRight, Heart, MessageSquare, Shield, CreditCard, CheckCircle2, Target, Globe, BarChart3, ChevronDown, DollarSign, BookOpen, Building2, School, Church, Handshake, Zap, Mail, Lock, Share2, Layers, TrendingUp, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicNav } from '@/components/shared/public-nav';
import { PublicFooter } from '@/components/shared/public-footer';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Quorum — Membership & Donation Platform for Organizations',
  description: 'Manage memberships, collect donations, and build community with Quorum. White-labeled platform for nonprofits with tiered memberships, campaign tracking, encrypted chat, and card payments.',
  openGraph: {
    title: 'Quorum — Membership & Donation Platform',
    description: 'Manage memberships, collect donations, and build community. White-labeled platform for nonprofits.',
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://quorum.app',
    siteName: 'Quorum',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quorum — Membership & Donation Platform',
    description: 'Manage memberships, collect donations, and build community. White-labeled platform for nonprofits.',
  },
};

const features = [
  {
    title: 'Membership tiers',
    description: 'Create plans with different prices and benefits. Monthly, yearly, or one-time. Let people pick what suits them.',
    icon: Layers,
  },
  {
    title: 'Donation campaigns',
    description: 'Set up fundraisers with goals and deadlines. Share them with your community and watch progress in real time.',
    icon: Target,
  },
  {
    title: 'Private chat rooms',
    description: 'Give members a space to talk. Make some rooms public, others for members only, or restrict by membership tier.',
    icon: MessageSquare,
  },
  {
    title: 'Secure Card Payments',
    description: 'Accept Visa and Mastercard from anywhere in the world via PesaPal. Recurring billing included.',
    icon: CreditCard,
  },
  {
    title: 'Dashboard & Reports',
    description: 'See who joined, what they gave, and how much is coming in. Everything you need to make informed decisions.',
    icon: BarChart3,
  },
  {
    title: 'Access control',
    description: 'Control who sees what. Give different access to admins, members, and the public. Keep sensitive info safe.',
    icon: Shield,
  },
];

const steps = [
  {
    number: '01',
    title: 'Create your organization',
    description: 'Tell us about your group — name, location, what you do. Takes 5 minutes. No credit card needed.',
    icon: Building2,
  },
  {
    number: '02',
    title: 'Set up your offerings',
    description: 'Create membership tiers, donation campaigns, and chat rooms. Customize your public page with your logo and colors.',
    icon: Layers,
  },
  {
    number: '03',
    title: 'Share with your community',
    description: 'Share your public page link. Members join, donate, and chat — all in one place. You get notifications for everything.',
    icon: Share2,
  },
];

const audiences = [
  {
    title: 'Nonprofits & NGOs',
    description: 'Track donors, manage volunteers, run fundraising campaigns. Keep your supporters updated with chat and announcements.',
    icon: Heart,
    benefits: ['Donor management', 'Campaign fundraising', 'Volunteer coordination'],
  },
  {
    title: 'Churches & religious orgs',
    description: 'Collect tithes and offerings online. Manage membership rolls. Share sermon notes and organize small groups.',
    icon: Church,
    benefits: ['Online giving', 'Member directory', 'Small group chat'],
  },
  {
    title: 'Schools & alumni associations',
    description: 'Keep track of alumni, collect dues, organize reunions. Share job postings and news with your community.',
    icon: School,
    benefits: ['Alumni directory', 'Dues collection', 'Event coordination'],
  },
  {
    title: 'Community groups & clubs',
    description: 'Manage memberships, collect fees, organize events. Give your group a home online without the complexity.',
    icon: Handshake,
    benefits: ['Easy signups', 'Fee collection', 'Group discussion'],
  },
];

const faqs = [
  {
    q: 'How much does Quorum cost?',
    a: 'It is free to create your organization with up to 500 members. We charge a 10% platform fee on donations and memberships. For organizations with 500+ members, Growth plan is $99/month with a reduced 5% fee. For 1,000+ members, Enterprise plan is $199/month with a 5% fee. You choose whether your organization pays the fee or passes it to the donor.',
  },
  {
    q: 'What payment methods do you support?',
    a: 'We support bank cards (Visa, Mastercard) through PesaPal. Your members and donors can pay securely from anywhere in the world.',
  },
  {
    q: 'Can members use Quorum without downloading an app?',
    a: 'Yes. Everything works in a web browser on any phone, tablet, or computer. There is nothing to download. Members can join, donate, and chat right from their browser.',
  },
  {
    q: 'Is my organization\'s data safe?',
    a: 'Yes. We use industry-standard encryption for all data. Chat messages are encrypted so only the intended recipients can read them. Payment processing is handled by PesaPal — your payment details never touch our servers.',
  },
  {
    q: 'Can I use my own domain and branding?',
    a: 'Yes. All plans include white-labeled pages with your logo, brand colors, and custom URL. The page shows your name — not Quorum\'s. You can also configure your own email sender so emails come from your domain.',
  },
  {
    q: 'What if someone in my community does not have a smartphone?',
    a: 'The platform works on any basic smartphone browser. For members without smartphones, you can still manage their information from the dashboard and record offline payments.',
  },
];

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col pb-16 md:pb-0">
      <PublicNav />

      <main className="flex-1">
        {/* ───── Hero ───── */}
        <section className="relative overflow-hidden py-20 sm:py-28 lg:py-36">
          <div className="absolute inset-0 -z-10">
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_left,_var(--tw-gradient-stops))] from-primary/8 via-transparent to-transparent" />
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 h-px w-3/4 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
          </div>
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl text-center">
              <div className="mb-6 inline-flex items-center gap-2 rounded-full border bg-muted/60 px-4 py-1.5 text-xs font-medium backdrop-blur-sm">
                <span className="size-1.5 rounded-full bg-primary" />
                For nonprofits, churches, schools, and community groups
              </div>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl leading-[1.1]">
                Run your organization without{' '}
                <span className="bg-gradient-to-r from-primary to-primary/70 bg-clip-text text-transparent">the headache</span>
              </h1>
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-muted-foreground sm:text-xl">
                Simple tools to manage members, collect donations, and keep everyone connected.
                No complicated software. Free to start — pay only when you grow.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
                <Link href="/auth/signup">
                  <Button size="lg" className="h-13 px-8 text-base shadow-md transition-all hover:shadow-lg">
                    Start free
                    <ArrowRight className="ml-2 size-4" />
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button variant="outline" size="lg" className="h-13 px-8 text-base">
                    See how it works
                  </Button>
                </Link>
              </div>
              <div className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> No credit card needed</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Free to start</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Secure card payments</span>
                <span className="flex items-center gap-1.5"><CheckCircle2 className="size-4 text-primary" /> Works on any phone</span>
              </div>
            </div>
          </div>
        </section>

        {/* ───── Problem / Solution ───── */}
        <section className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-3xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Running an organization is a lot of work
              </h2>
              <p className="mt-4 text-lg text-muted-foreground">
                You have member lists on paper, cash donations with no records, 
                and group chats that get lost in the noise. There has to be a better way.
              </p>
            </div>
            <div className="mt-16 grid gap-8 sm:grid-cols-3">
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10">
                  <BookOpen className="size-6 text-destructive" />
                </div>
                <h3 className="font-semibold">Paper records</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Names in notebooks, payments on scraps of paper. Hard to search, easy to lose.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10">
                  <DollarSign className="size-6 text-destructive" />
                </div>
                <h3 className="font-semibold">Cash only</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Missing out on donations from people who want to give but cannot deliver cash.
                </p>
              </div>
              <div className="rounded-xl border bg-card p-6 text-center">
                <div className="mx-auto mb-4 flex size-12 items-center justify-center rounded-xl bg-destructive/10">
                  <MessageSquare className="size-6 text-destructive" />
                </div>
                <h3 className="font-semibold">Scattered communication</h3>
                <p className="mt-2 text-sm text-muted-foreground">
                  Important messages lost in WhatsApp groups. No way to reach only members.
                </p>
              </div>
            </div>
            <div className="mx-auto mt-12 max-w-2xl text-center">
              <div className="inline-flex items-center gap-2 rounded-full border bg-primary/5 px-5 py-2 text-sm font-medium text-primary">
                <Zap className="size-4" />
                Quorum brings everything together in one place
              </div>
            </div>
          </div>
        </section>

        {/* ───── How It Works ───── */}
        <section id="how-it-works" className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">How it works</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Get your organization online in minutes. No technical skills needed.
              </p>
            </div>
            <div className="relative grid gap-8 md:grid-cols-3">
              {steps.map((step, i) => (
                <div key={step.number} className="relative flex flex-col items-center text-center">
                  {i < steps.length - 1 && (
                    <div className="absolute top-8 left-[calc(50%+2.5rem)] hidden h-px w-[calc(100%-5rem)] bg-gradient-to-r from-primary/30 to-transparent md:block" />
                  )}
                  <div className="flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                    <step.icon className="size-7 text-primary" />
                  </div>
                  <div className="mt-4 inline-flex h-6 items-center rounded-full bg-primary/10 px-3 text-xs font-medium text-primary">
                    Step {step.number}
                  </div>
                  <h3 className="mt-4 text-lg font-semibold">{step.title}</h3>
                  <p className="mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">
                    {step.description}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Features ───── */}
        <section id="features" className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Everything you need</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Six tools that work together to save you time and help you grow.
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

        {/* ───── For You ───── */}
        <section className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Built for organizations like yours</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Whether you run a small community group or a growing nonprofit, Quorum fits the way you work.
              </p>
            </div>
            <div className="grid gap-6 lg:grid-cols-4">
              {audiences.map((audience) => (
                <div
                  key={audience.title}
                  className="group rounded-xl border bg-card p-6 transition-all hover:shadow-lg"
                >
                  <div className="mb-4 flex size-12 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-primary/5">
                    <audience.icon className="size-6 text-primary" />
                  </div>
                  <h3 className="text-base font-semibold">{audience.title}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                    {audience.description}
                  </p>
                  <ul className="mt-4 space-y-2">
                    {audience.benefits.map((benefit) => (
                      <li key={benefit} className="flex items-center gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="size-3.5 text-primary shrink-0" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Stats ───── */}
        <section className="border-t py-16 sm:py-20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">3</div>
                <p className="mt-1 text-sm text-muted-foreground">Minutes to set up</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">10%</div>
                <p className="mt-1 text-sm text-muted-foreground">Platform fee — or less</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">Free</div>
                <p className="mt-1 text-sm text-muted-foreground">Up to 500 members</p>
              </div>
              <div className="text-center">
                <div className="text-4xl font-bold text-primary">24/7</div>
                <p className="mt-1 text-sm text-muted-foreground">Available on any device</p>
              </div>
            </div>
          </div>
        </section>

        {/* ───── More reasons ───── */}
        <section className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Why organizations choose Quorum</h2>
            </div>
            <div className="mx-auto grid max-w-4xl gap-8 sm:grid-cols-2">
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Works on any device</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Phones, tablets, laptops — it just works. No app to download, no updates to install.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Globe className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Global card payments</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Accept Visa and Mastercard from supporters anywhere in the world.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Lock className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Your data stays safe</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Encrypted chats, secure payments, and full control over who sees what.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Mail className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Email notifications</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Automatic receipts, payment reminders, and expiry alerts. Less work for you.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <Heart className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">White-labeled pages</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    Your logo, your colors, your domain. No Quorum branding on your public page.
                  </p>
                </div>
              </div>
              <div className="flex gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <TrendingUp className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Real-time reports</h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    See exactly where your money comes from. Make better decisions with clear data.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ───── FAQ ───── */}
        <section id="faq" className="border-t bg-muted/30 py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto mb-16 max-w-2xl text-center">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">Frequently asked questions</h2>
              <p className="mt-4 text-lg text-muted-foreground">
                Quick answers to the things organizations usually ask us.
              </p>
            </div>
            <div className="mx-auto max-w-3xl space-y-4">
              {faqs.map((faq) => (
                <details
                  key={faq.q}
                  className="group rounded-xl border bg-card transition-all open:shadow-sm"
                >
                  <summary className="flex cursor-pointer items-center justify-between gap-4 px-6 py-4 text-sm font-medium list-none">
                    {faq.q}
                    <ChevronDown className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
                  </summary>
                  <div className="border-t px-6 py-4 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* ───── Final CTA ───── */}
        <section className="border-t py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="mx-auto max-w-4xl">
              <div className="relative overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-8 sm:p-12 lg:p-16 shadow-sm">
                <div className="absolute top-0 right-0 -z-10 size-64 translate-x-1/3 -translate-y-1/3 rounded-full bg-primary/10 blur-3xl" />
                <div className="mx-auto max-w-2xl text-center">
                  <div className="mx-auto mb-6 flex size-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 ring-1 ring-primary/20">
                    <Star className="size-8 text-primary" />
                  </div>
                  <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                    Ready to bring your organization online?
                  </h2>
                  <p className="mt-4 text-lg text-muted-foreground">
                    Join organizations that use Quorum to manage members, collect donations, and stay connected. 
                    It is free to start and takes minutes to set up.
                  </p>
                  <div className="mt-8 flex flex-col items-center justify-center gap-4 sm:flex-row">
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
                  <p className="mt-6 text-xs text-muted-foreground">
                    No credit card needed &middot; Free to start &middot; Cancel anytime
                  </p>
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
