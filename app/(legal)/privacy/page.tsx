import type { Metadata } from 'next';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PublicNav } from '@/components/shared/public-nav';
import { PublicFooter } from '@/components/shared/public-footer';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Agaseke for Organizations Privacy Policy',
};

export default function PrivacyPage() {
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

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">Privacy Policy</h1>
          <p className="mt-3 text-sm text-muted-foreground">Last updated: June 2025</p>

          <div className="mt-10 space-y-8 text-sm leading-relaxed text-foreground/80">
            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">1. Information We Collect</h2>
              <p>
                We collect information you provide when creating an account, including your name, email address, and organization details. We also collect payment information, which is processed by our third-party payment processors and not stored on our servers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">2. How We Use Your Information</h2>
              <p>
                We use your information to provide and improve the Platform, process transactions, send administrative communications, and comply with legal obligations.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">3. Data Sharing</h2>
              <p>
                We do not sell your personal information. We may share data with payment processors to complete transactions, with organization administrators for membership management, and as required by law.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">4. Data Security</h2>
              <p>
                We implement industry-standard security measures including encryption of data in transit and at rest. Chat messages are encrypted end-to-end. However, no method of electronic storage is 100% secure.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">5. Your Rights</h2>
              <p>
                You have the right to access, correct, or delete your personal data. You can request a copy of your data or ask us to stop processing it. Contact us at support@agaseke.me to exercise these rights.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">6. Cookies</h2>
              <p>
                We use essential cookies for authentication and platform functionality. We do not use tracking cookies or third-party analytics.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">7. Third-Party Services</h2>
              <p>
                We use Firebase (Google) for authentication, database, and storage. We use pawaPay for payment processing and ImageKit for image management. These services have their own privacy policies.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">8. Data Retention</h2>
              <p>
                We retain your data for as long as your account is active or as needed to provide services. After account deletion, we may retain certain data for legal compliance and fraud prevention.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">9. Children&apos;s Privacy</h2>
              <p>
                The Platform is not intended for children under 13. We do not knowingly collect data from children. If you believe a child has provided us with data, contact us to have it removed.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">10. International Data Transfers</h2>
              <p>
                Your data may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place for such transfers.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">11. Changes to This Policy</h2>
              <p>
                We may update this policy from time to time. We will notify organization administrators of material changes via email or platform notification.
              </p>
            </section>

            <section>
              <h2 className="mb-3 text-lg font-semibold text-foreground">12. Contact</h2>
              <p>
                For privacy-related inquiries, contact us at support@agaseke.me.
              </p>
            </section>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
