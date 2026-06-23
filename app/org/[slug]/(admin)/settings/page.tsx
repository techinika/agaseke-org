'use client';

import { useState, useRef } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { PageHeader } from '@/components/shared/page-header';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { useOrganizationBySlug, useUpdateOrganization } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useImageUpload } from '@/hooks/use-image-upload';
import { toast } from 'sonner';

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org, isLoading } = useOrganizationBySlug(slug);
  const updateOrg = useUpdateOrganization(org?.id ?? '');

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoURL, setLogoURL] = useState('');
  const [coverURL, setCoverURL] = useState('');
  const [initialized, setInitialized] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const { upload: uploadLogo, isUploading: logoUploading } = useImageUpload({ folder: 'logos' });
  const { upload: uploadCover, isUploading: coverUploading } = useImageUpload({ folder: 'covers' });

  if (!initialized && org) {
    setName(org.name);
    setDescription(org.description);
    setLogoURL(org.logoURL ?? '');
    setCoverURL(org.coverURL ?? '');
    setInitialized(true);
  }

  async function handleSave() {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        name,
        description,
        logoURL: logoURL || null,
        coverURL: coverURL || null,
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  }

  async function handleLogoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadLogo(file);
    if (url) {
      setLogoURL(url);
      toast.success('Logo uploaded');
    }
    if (logoInputRef.current) logoInputRef.current.value = '';
  }

  async function handleCoverUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadCover(file);
    if (url) {
      setCoverURL(url);
      toast.success('Cover image uploaded');
    }
    if (coverInputRef.current) coverInputRef.current.value = '';
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <PageHeader title="Settings" description="Configure your organization" />
        <div className="h-64 animate-pulse rounded-xl bg-muted" />
      </div>
    );
  }

  if (!org) {
    return (
      <div className="py-12 text-center">
        <p className="text-muted-foreground">Organization not found.</p>
      </div>
    );
  }

  const isAdmin = org.adminIds.includes(user?.uid ?? '');

  return (
    <div className="space-y-8">
      <PageHeader title="Settings" description="Configure your organization settings" />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">General Information</CardTitle>
          <CardDescription>Update your organization&apos;s public details</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Organization name</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} disabled={!isAdmin} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="desc">Description</Label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Tell visitors about your organization..."
              minHeight="200px"
            />
          </div>
          {isAdmin && (
            <Button onClick={handleSave} disabled={updateOrg.isPending}>
              {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
              Save changes
            </Button>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appearance</CardTitle>
          <CardDescription>Customize how your organization looks on its public page</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="logoURL">Logo</Label>
                <div className="flex gap-2">
                  <Input
                    id="logoURL"
                    value={logoURL}
                    onChange={(e) => setLogoURL(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    className="flex-1"
                  />
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp,image/svg+xml"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => logoInputRef.current?.click()}
                    disabled={logoUploading}
                  >
                    {logoUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Will be used as the org icon and favicon. Leave empty to show only the name.
                </p>
                {logoURL && (
                  <div className="mt-2 flex items-center gap-3">
                    <img src={logoURL} alt="Preview" className="size-10 rounded-lg object-cover border" />
                    <span className="text-xs text-muted-foreground">Preview</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="coverURL">Cover Image</Label>
                <div className="flex gap-2">
                  <Input
                    id="coverURL"
                    value={coverURL}
                    onChange={(e) => setCoverURL(e.target.value)}
                    placeholder="https://example.com/cover.jpg"
                    className="flex-1"
                  />
                  <input
                    ref={coverInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
                    className="hidden"
                    onChange={handleCoverUpload}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => coverInputRef.current?.click()}
                    disabled={coverUploading}
                  >
                    {coverUploading ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Large banner image shown at the top of your organization page.
                </p>
                {coverURL && (
                  <div className="mt-2 overflow-hidden rounded-lg border">
                    <img src={coverURL} alt="Cover preview" className="h-24 w-full object-cover" />
                  </div>
                )}
              </div>
              <Button onClick={handleSave} disabled={updateOrg.isPending}>
                {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Save className="mr-2 size-4" />}
                Save appearance
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify settings.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
