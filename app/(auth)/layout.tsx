import type { Metadata } from 'next';

export const metadata: Metadata = {
  description: 'Sign in or create an account on Agaseke for Organizations.',
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
