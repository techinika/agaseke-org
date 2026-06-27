import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PublicNav } from '@/components/shared/public-nav';
import { PublicFooter } from '@/components/shared/public-footer';

export const metadata: Metadata = {
  title: 'Terms of Service',
  description: 'Quorum. Terms of Service',
};

export default function TermsPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <PublicNav />
      <main className="flex-1">
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8 sm:py-16">
          <div className="mb-8">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-muted-foreground transition-colors hover:text-primary"
            >
              <ArrowLeft className="size-4" />
              Back to home
            </Link>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Terms of Service</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2025</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Acceptance of Terms</h2>
              <p>
                By accessing or using Quorum. (&ldquo;the Platform&rdquo;), you agree to be bound by these Terms of Service. If you do not agree, do not use the Platform.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. Description of Service</h2>
              <p>
                The Platform provides nonprofit organizations with tools to manage memberships, collect donations, communicate with members through chat rooms, and track financial contributions.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. User Accounts</h2>
              <p>
                You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur under your account. You must notify us immediately of any unauthorized use.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. Organization Responsibilities</h2>
              <p>
                Organizations using the Platform are responsible for complying with all applicable laws and regulations, including those related to fundraising, data protection, and financial reporting. Organizations must ensure their content does not violate any third-party rights.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Donations and Membership Fees</h2>
              <p>
                All donations and membership fees are processed through third-party payment processors. The Platform charges a platform fee on each transaction as disclosed during checkout. Organizations set their own membership prices and donation goals. Refunds are subject to the organization&apos;s refund policy.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Platform Fees</h2>
              <p>
                The Platform charges a fee on each financial transaction processed through the service. The current fee rate and applicable terms are displayed during the checkout process. Fees may be adjusted with notice to organization administrators.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Chat and Communication</h2>
              <p>
                Chat messages are encrypted in transit. Organizations control access to their chat rooms. Users must not share offensive, illegal, or harmful content. The Platform reserves the right to remove content and suspend users who violate these rules.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. Limitation of Liability</h2>
              <p>
                The Platform is provided &ldquo;as is&rdquo; without warranties of any kind. We are not liable for damages arising from the use or inability to use the Platform, including loss of data, revenue, or business interruption.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Termination</h2>
              <p>
                We reserve the right to suspend or terminate access to the Platform for violations of these terms or for any other reason with reasonable notice where possible.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. Changes to Terms</h2>
              <p>
                We may modify these terms at any time. Continued use of the Platform after changes constitutes acceptance of the new terms. Organization administrators will be notified of material changes.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">11. Governing Law</h2>
              <p>
                These terms are governed by the laws of the Republic of Rwanda. Any disputes shall be resolved in the courts of Rwanda.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">12. Contact</h2>
              <p>
                For questions about these terms, contact us at support@quorum.app.
              </p>
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
