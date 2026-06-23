'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, Mail, RefreshCw, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { verifyEmail } from '@/lib/firebase/auth';
import { useAuthStore } from '@/store/auth-store';
import { toast } from 'sonner';

export default function VerifyEmailPage() {
  const { user } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [resent, setResent] = useState(false);

  async function handleResend() {
    setIsLoading(true);
    const { error } = await verifyEmail();
    setIsLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setResent(true);
    toast.success('Verification email sent!');
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-primary/[0.02] px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-primary/10">
          <Mail className="size-7 text-primary" />
        </div>
        <h1 className="mb-2 text-2xl font-bold tracking-tight">Verify your email</h1>
        <p className="mb-6 text-muted-foreground">
          We sent a verification email to{' '}
          <strong className="text-foreground">{user?.email || 'your email'}</strong>
        </p>

        <Card className="border shadow-sm">
          <CardContent className="space-y-4 p-6">
            <p className="text-sm text-muted-foreground">
              Click the link in the email to activate your account. If you don&apos;t
              see it, check your spam folder.
            </p>

            {resent && (
              <p className="text-xs font-medium text-success">Verification email resent!</p>
            )}

            <Button
              variant="outline"
              className="w-full h-11 text-sm font-medium"
              onClick={handleResend}
              disabled={isLoading}
            >
              {isLoading ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 size-4" />
              )}
              Resend verification email
            </Button>

            <Link href="/auth/login">
              <Button variant="ghost" className="w-full" size="sm">
                <ArrowLeft className="mr-2 size-4" />
                Back to login
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
