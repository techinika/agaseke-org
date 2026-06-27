'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent } from '@/components/ui/card';
import { resetPassword } from '@/lib/firebase/auth';
import { toast } from 'sonner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email) return;
    setIsLoading(true);
    const { error } = await resetPassword(email);
    setIsLoading(false);
    if (error) {
      toast.error(error);
      return;
    }
    setSent(true);
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-primary/[0.02] px-4 py-12">
        <div className="w-full max-w-sm text-center">
          <div className="mx-auto mb-6 flex size-14 items-center justify-center rounded-full bg-success/10">
            <CheckCircle2 className="size-7 text-success" />
          </div>
          <h1 className="mb-2 text-2xl font-bold tracking-tight">Check your email</h1>
          <p className="mb-6 text-muted-foreground">
            We sent a password reset link to <strong className="text-foreground">{email}</strong>
          </p>
          <Card className="border shadow-sm">
            <CardContent className="p-6">
              <p className="mb-4 text-sm text-muted-foreground">
                If you don&apos;t see it, check your spam folder. The link expires in 1 hour.
              </p>
              <Link href="/auth/login">
                <Button variant="outline" className="w-full h-11">
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

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-b from-background via-background to-primary/[0.02] px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <Link href="/" className="mx-auto mb-6 block">
            <span className="text-2xl font-bold tracking-tight"><span className="text-primary">Q</span>uorum.</span>
          </Link>
          <h1 className="text-2xl font-bold tracking-tight">Forgot password?</h1>
          <p className="mt-1.5 text-muted-foreground">Enter your email and we&apos;ll send you a reset link</p>
        </div>

        <Card className="border shadow-sm">
          <CardContent className="p-6">
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                  className="h-11"
                />
              </div>
              <Button type="submit" className="w-full h-11 text-base font-medium shadow-sm" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                Send reset link
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="mt-6 text-center">
          <Link href="/auth/login">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="mr-2 size-4" />
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}
