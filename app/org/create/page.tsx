'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2, Check, ChevronLeft, ImageIcon, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useAuthStore } from '@/store/auth-store';
import { addDocument, setDocument, queryDocuments } from '@/lib/firebase/firestore';
import { COLLECTIONS } from '@/lib/constants';
import { useImageUpload } from '@/hooks/use-image-upload';
import { toast } from 'sonner';
import { Organization } from '@/types/organization';
import { where } from 'firebase/firestore';
import { createUserDocument, getUserDocument } from '@/lib/firebase/auth';

const CATEGORIES = [
  { value: 'NGO', label: 'NGO' },
  { value: 'Association', label: 'Association' },
  { value: 'Church', label: 'Church' },
  { value: 'School', label: 'School' },
  { value: 'Cooperative', label: 'Cooperative' },
  { value: 'Foundation', label: 'Foundation' },
  { value: 'Other', label: 'Other' },
];

const COUNTRIES = [
  { value: 'RW', label: 'Rwanda' },
  { value: 'UG', label: 'Uganda' },
  { value: 'KE', label: 'Kenya' },
  { value: 'TZ', label: 'Tanzania' },
  { value: 'BI', label: 'Burundi' },
  { value: 'CD', label: 'DR Congo' },
  { value: 'NG', label: 'Nigeria' },
  { value: 'GH', label: 'Ghana' },
  { value: 'ZA', label: 'South Africa' },
  { value: 'ET', label: 'Ethiopia' },
];

interface FormData {
  name: string;
  description: string;
  category: string;
  country: string;
  logoURL: string;
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function CreateOrgPage() {
  const router = useRouter();
  const { user, profile, isLoading: authLoading, setProfile } = useAuthStore();
  const [step, setStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [form, setForm] = useState<FormData>({
    name: '',
    description: '',
    category: '',
    country: '',
    logoURL: '',
  });
  const logoInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadLogo, isUploading: logoUploading } = useImageUpload({ folder: 'logos' });

  function updateField(field: keyof FormData, value: string) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  function canProceed(): boolean {
    switch (step) {
      case 1:
        return form.name.length >= 2 && form.description.length >= 10;
      case 2:
        return !!form.category && !!form.country;
      default:
        return true;
    }
  }

  async function handleSubmit() {
    if (!user) {
      toast.error('You must be logged in to create an organization.');
      return;
    }
    setIsSubmitting(true);
    try {
      const slug = slugify(form.name);
      if (!slug) {
        toast.error('Invalid organization name.');
        return;
      }

      const existing = await queryDocuments<Organization>(
        COLLECTIONS.ORGANIZATIONS,
        where('slug', '==', slug)
      );
      if (existing.length > 0) {
        toast.error('An organization with this name already exists. Please use a different name.');
        return;
      }

      const existingUserDoc = await getUserDocument(user.uid);
      if (!existingUserDoc) {
        await createUserDocument(user.uid, {
          email: user.email!,
          displayName: user.displayName || 'Admin',
          photoURL: user.photoURL,
        });
      }

      await addDocument(COLLECTIONS.ORGANIZATIONS, {
        name: form.name,
        slug,
        description: form.description,
        logoURL: form.logoURL || null,
        coverURL: null,
        adminIds: [user.uid],
        status: 'active',
        country: form.country,
        category: form.category,
      });

      await setDocument(`${COLLECTIONS.USERS}/${user.uid}`, {
        type: 'org_admin',
      });
      if (profile) {
        setProfile({ ...profile, type: 'org_admin' });
      }

      toast.success('Organization created!');
      router.push(`/org/${slug}/dashboard`);
    } catch (error) {
      toast.error('Failed to create organization. Please try again.');
      console.error(error);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="size-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Sign in required</CardTitle>
            <CardDescription>You need to be logged in to create an organization.</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Button onClick={() => router.push('/auth/login')}>Sign in</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <div className="mb-8 text-center">
          <div className="mb-4">
            <Link href="/org" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="size-4" />
              Back to organizations
            </Link>
          </div>
          <h1 className="text-2xl font-bold">Create your organization</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set up your organization in just a few steps
          </p>
        </div>

        <div className="mb-8 flex items-center justify-center gap-2">
          {[1, 2, 3].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`flex size-8 items-center justify-center rounded-full text-xs font-medium ${
                  s < step
                    ? 'bg-primary text-primary-foreground'
                    : s === step
                      ? 'border-2 border-primary text-primary'
                      : 'border bg-muted text-muted-foreground'
                }`}
              >
                {s < step ? <Check className="size-4" /> : s}
              </div>
              {s < 3 && <div className={`h-px w-12 ${s < step ? 'bg-primary' : 'bg-border'}`} />}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>
              {step === 1 && 'Basic information'}
              {step === 2 && 'Category & location'}
              {step === 3 && 'Organization logo'}
            </CardTitle>
            <CardDescription>
              {step === 1 && 'Tell us about your organization'}
              {step === 2 && 'Help people discover your organization'}
              {step === 3 && 'Add a logo to make your page recognizable (optional)'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-5">
            {step === 1 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="name">Organization name *</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Rwanda Women's Association"
                    value={form.name}
                    onChange={(e) => updateField('name', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description *</Label>
                  <Textarea
                    id="description"
                    placeholder="Briefly describe what your organization does..."
                    rows={4}
                    value={form.description}
                    onChange={(e) => updateField('description', e.target.value)}
                  />
                </div>
              </>
            )}

            {step === 2 && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="category">Category *</Label>
                  <Select value={form.category} onValueChange={(v) => v && updateField('category', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {CATEGORIES.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="country">Country *</Label>
                  <Select value={form.country} onValueChange={(v) => v && updateField('country', v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a country" />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c.value} value={c.value}>
                          {c.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}

            {step === 3 && (
              <div className="space-y-4">
                <div className="flex flex-col items-center gap-4 rounded-lg border-2 border-dashed p-8">
                  <div className="flex size-16 items-center justify-center rounded-full bg-muted">
                    <ImageIcon className="size-8 text-muted-foreground" />
                  </div>
                  <div className="text-center">
                    <p className="text-sm font-medium">Upload your logo</p>
                    <p className="text-xs text-muted-foreground">
                      PNG, JPG or SVG. Max 5MB.
                    </p>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      const url = await uploadLogo(file);
                      if (url) updateField('logoURL', url);
                      if (logoInputRef.current) logoInputRef.current.value = '';
                    }}
                  />
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={logoUploading}
                    onClick={() => logoInputRef.current?.click()}
                  >
                    {logoUploading ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Upload className="mr-2 size-4" />}
                    {logoUploading ? 'Uploading...' : 'Choose file'}
                  </Button>
                  {form.logoURL && (
                    <img src={form.logoURL} alt="Preview" className="size-16 rounded-lg object-cover border" />
                  )}
                  <p className="text-xs text-muted-foreground">
                    Your logo will appear on your organization page. You can change it later in settings.
                  </p>
                </div>
              </div>
            )}
          </CardContent>
          <div className="flex items-center justify-between border-t p-6">
            {step > 1 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="mr-2 size-4" />
                Back
              </Button>
            ) : (
              <div />
            )}
            {step < 3 ? (
              <Button onClick={() => setStep(step + 1)} disabled={!canProceed()}>
                Continue
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                Create organization
              </Button>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
