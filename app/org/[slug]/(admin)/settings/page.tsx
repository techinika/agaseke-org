'use client';

import { useState, useRef, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { Save, Loader2, Upload, Plus, Pencil, Trash2, MessageSquare, Mail, Building2, Globe, Phone, Crown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PageHeader } from '@/components/shared/page-header';
import { RichTextEditor } from '@/components/shared/rich-text-editor';
import { useOrganizationBySlug, useUpdateOrganization } from '@/hooks/use-organization';
import { CATEGORIES, COUNTRIES, SUBSCRIPTION_PRICING } from '@/lib/constants';
import { useAuthStore } from '@/store/auth-store';
import { WORKERS } from '@/lib/workers';
import { useRooms, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useTiers } from '@/hooks/use-tiers';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { Room } from '@/types/room';
import { toast } from 'sonner';
import Link from 'next/link';

export default function SettingsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org, isLoading } = useOrganizationBySlug(slug);
  const updateOrg = useUpdateOrganization(org?.id ?? '');

  const [name, setName] = useState(() => org?.name ?? '');
  const [description, setDescription] = useState(() => org?.description ?? '');
  const [logoURL, setLogoURL] = useState(() => org?.logoURL ?? '');
  const [coverURL, setCoverURL] = useState(() => org?.coverURL ?? '');

  const [smtpHost, setSmtpHost] = useState(() => org?.smtpHost ?? '');
  const [smtpPort, setSmtpPort] = useState(() => String(org?.smtpPort ?? 587));
  const [smtpUser, setSmtpUser] = useState(() => org?.smtpUser ?? '');
  const [smtpPass, setSmtpPass] = useState('');
  const [smtpFromEmail, setSmtpFromEmail] = useState(() => org?.smtpFromEmail ?? '');
  const [smtpFromName, setSmtpFromName] = useState(() => org?.smtpFromName ?? '');
  const [brandColor, setBrandColor] = useState(() => org?.brandColor ?? '#FF0000');
  const [category, setCategory] = useState(() => org?.category ?? '');
  const [country, setCountry] = useState(() => org?.country ?? '');
  const [hasSmtpPass, setHasSmtpPass] = useState(() => !!org?.smtpPass);

  const [bankName, setBankName] = useState(() => org?.bankName ?? '');
  const [bankAccountName, setBankAccountName] = useState(() => org?.bankAccountName ?? '');
  const [bankAccountNumber, setBankAccountNumber] = useState(() => org?.bankAccountNumber ?? '');
  const [swiftCode, setSwiftCode] = useState(() => org?.swiftCode ?? '');
  const [bankAddress, setBankAddress] = useState(() => org?.bankAddress ?? '');

  const [websiteUrl, setWebsiteUrl] = useState(() => org?.websiteUrl ?? '');
  const [contactEmail, setContactEmail] = useState(() => org?.contactEmail ?? '');
  const [contactPhone, setContactPhone] = useState(() => org?.contactPhone ?? '');
  const [footerText, setFooterText] = useState(() => org?.footerText ?? '');

  const [savingSmtp, setSavingSmtp] = useState(false);

  const logoInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);
  const smtpPassChangedRef = useRef(false);
  const [logoUploading, setLogoUploading] = useState(false);
  const [coverUploading, setCoverUploading] = useState(false);

  const { data: rooms, isLoading: roomsLoading } = useRooms(org?.id ?? '');
  const { data: tiers } = useTiers(org?.id ?? '');
  const createRoom = useCreateRoom(org?.id ?? '');
  const updateRoom = useUpdateRoom(org?.id ?? '');
  const deleteRoom = useDeleteRoom(org?.id ?? '');

  const [roomDialogOpen, setRoomDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);

  const prevOrgIdRef = useRef(org?.id);

  useEffect(() => {
    if (!org || org.id === prevOrgIdRef.current) return;
    prevOrgIdRef.current = org.id;
    setName(org.name);
    setDescription(org.description);
    setLogoURL(org.logoURL ?? '');
    setCoverURL(org.coverURL ?? '');
    setSmtpHost(org.smtpHost ?? '');
    setSmtpPort(String(org.smtpPort ?? 587));
    setSmtpUser(org.smtpUser ?? '');
    setSmtpPass('');
    setHasSmtpPass(!!org.smtpPass);
    smtpPassChangedRef.current = false;
    setSmtpFromEmail(org.smtpFromEmail ?? '');
    setSmtpFromName(org.smtpFromName ?? '');
    setBrandColor(org.brandColor ?? '#FF0000');
    setCategory(org.category ?? '');
    setCountry(org.country ?? '');
    setBankName(org.bankName ?? '');
    setBankAccountName(org.bankAccountName ?? '');
    setBankAccountNumber(org.bankAccountNumber ?? '');
    setSwiftCode(org.swiftCode ?? '');
    setBankAddress(org.bankAddress ?? '');
    setWebsiteUrl(org.websiteUrl ?? '');
    setContactEmail(org.contactEmail ?? '');
    setContactPhone(org.contactPhone ?? '');
    setFooterText(org.footerText ?? '');
  }, [org]);

  async function handleSave() {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        name,
        description,
        category,
        country,
        logoURL: logoURL || null,
        coverURL: coverURL || null,
        brandColor: brandColor || '#FF0000',
      });
      toast.success('Settings saved');
    } catch {
      toast.error('Failed to save settings');
    }
  }

  async function handleSaveSmtp() {
    if (!org) return;
    setSavingSmtp(true);
    try {
      const body: Record<string, unknown> = {
        orgId: org.id,
        smtpHost,
        smtpPort: smtpPort ? parseInt(smtpPort) : null,
        smtpUser,
        smtpFromEmail,
        smtpFromName,
      };
      if (smtpPassChangedRef.current) {
        body.smtpPass = smtpPass || '';
      }
      const res = await fetch('/api/org/smtp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed to save');
      setHasSmtpPass(smtpPassChangedRef.current ? !!smtpPass : hasSmtpPass);
      if (smtpPassChangedRef.current) {
        smtpPassChangedRef.current = false;
      }
      toast.success('Email settings saved');
    } catch {
      toast.error('Failed to save email settings');
    } finally {
      setSavingSmtp(false);
    }
  }

  async function handleSavePayout() {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        bankName: bankName || undefined,
        bankAccountName: bankAccountName || undefined,
        bankAccountNumber: bankAccountNumber || undefined,
        swiftCode: swiftCode || undefined,
        bankAddress: bankAddress || undefined,
      });
      toast.success('Payout settings saved');
    } catch {
      toast.error('Failed to save payout settings');
    }
  }

  async function handleSaveBranding() {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        websiteUrl: websiteUrl || undefined,
        contactEmail: contactEmail || undefined,
        contactPhone: contactPhone || undefined,
        footerText: footerText || undefined,
      });
      toast.success('Branding settings saved');
    } catch {
      toast.error('Failed to save branding settings');
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, folder: string, setUrl: (url: string) => void, setUploading: (v: boolean) => void) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('folder', folder);

      const res = await fetch(`${WORKERS.uploads.url}/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) throw new Error('Upload failed');
      const data = await res.json();
      setUrl(data.url);
      toast.success(folder === 'logos' ? 'Logo uploaded' : 'Cover image uploaded');
    } catch {
      toast.error('Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  }

  async function handleCreateRoom(data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) {
    try {
      await createRoom.mutateAsync(data);
      toast.success('Room created');
      setRoomDialogOpen(false);
    } catch {
      toast.error('Failed to create room');
    }
  }

  async function handleUpdateRoom(data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) {
    if (!editingRoom) return;
    try {
      await updateRoom.mutateAsync({ roomId: editingRoom.id, data });
      toast.success('Room updated');
      setRoomDialogOpen(false);
      setEditingRoom(null);
    } catch {
      toast.error('Failed to update room');
    }
  }

  async function handleDeleteRoom(room: Room) {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    try {
      await deleteRoom.mutateAsync(room.id);
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
    }
  }

  function handleEditRoom(room: Room) {
    setEditingRoom(room);
    setRoomDialogOpen(true);
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
        <CardContent className="pt-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-xl bg-primary/10">
                <Crown className="size-5 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Current Plan</p>
                <p className="text-lg font-bold">{SUBSCRIPTION_PRICING[org.subscriptionPlan || 'starter'].label}</p>
              </div>
            </div>
            <Link href={`/org/${slug}/subscription`}>
              <Button variant="outline" size="sm">
                Manage subscription
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>

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
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="category">Category</Label>
              <Select value={category} onValueChange={(v) => v && setCategory(v)} disabled={!isAdmin}>
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
              <Label htmlFor="country">Country</Label>
              <Select value={country} onValueChange={(v) => v && setCountry(v)} disabled={!isAdmin}>
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
                    onChange={(e) => handleFileUpload(e, 'logos', setLogoURL, setLogoUploading)}
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
                    onChange={(e) => handleFileUpload(e, 'covers', setCoverURL, setCoverUploading)}
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
              <div className="space-y-2">
                <Label htmlFor="brandColor">Brand Color</Label>
                <div className="flex items-center gap-3">
                  <input
                    id="brandColor"
                    type="color"
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    className="size-10 cursor-pointer rounded-lg border bg-transparent p-0.5"
                  />
                  <Input
                    value={brandColor}
                    onChange={(e) => setBrandColor(e.target.value)}
                    placeholder="#FF0000"
                    className="w-32 font-mono text-sm"
                  />
                  <span className="text-xs text-muted-foreground">
                    Used in email headers and CTAs
                  </span>
                </div>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Email Settings</CardTitle>
          <CardDescription>Configure custom SMTP for transactional emails</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <p className="text-xs text-muted-foreground">
                By default, emails are sent through the system SMTP provider. Configure your own SMTP server
                to send emails from your own domain. Leave empty to use system defaults.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="smtpHost">SMTP Host</Label>
                  <Input
                    id="smtpHost"
                    value={smtpHost}
                    onChange={(e) => setSmtpHost(e.target.value)}
                    placeholder="smtp.example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPort">SMTP Port</Label>
                  <Input
                    id="smtpPort"
                    value={smtpPort}
                    onChange={(e) => setSmtpPort(e.target.value)}
                    placeholder="587"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpUser">SMTP Username</Label>
                  <Input
                    id="smtpUser"
                    value={smtpUser}
                    onChange={(e) => setSmtpUser(e.target.value)}
                    placeholder="user@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpPass">SMTP Password</Label>
                  <Input
                    id="smtpPass"
                    type="password"
                    value={smtpPass}
                    onChange={(e) => { setSmtpPass(e.target.value); smtpPassChangedRef.current = true; }}
                    placeholder={hasSmtpPass ? 'Leave empty to keep current password' : '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022'}
                  />
                  {hasSmtpPass && (
                    <p className="text-xs text-muted-foreground">
                      An SMTP password is currently configured. Leave empty to keep it.
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromEmail">From Email</Label>
                  <Input
                    id="smtpFromEmail"
                    value={smtpFromEmail}
                    onChange={(e) => setSmtpFromEmail(e.target.value)}
                    placeholder="noreply@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="smtpFromName">From Name</Label>
                  <Input
                    id="smtpFromName"
                    value={smtpFromName}
                    onChange={(e) => setSmtpFromName(e.target.value)}
                    placeholder="Organization Name"
                  />
                </div>
              </div>
              <Button onClick={handleSaveSmtp} disabled={savingSmtp}>
                {savingSmtp ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Mail className="mr-2 size-4" />}
                Save email settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify email settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout Settings</CardTitle>
          <CardDescription>Bank details for receiving payouts from donations and memberships</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <p className="text-xs text-muted-foreground">
                Add your bank account details so we can send you payouts. All payouts are sent in USD.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="bankName">Bank Name</Label>
                  <Input
                    id="bankName"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    placeholder="e.g. Bank of America"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountName">Account Holder Name</Label>
                  <Input
                    id="bankAccountName"
                    value={bankAccountName}
                    onChange={(e) => setBankAccountName(e.target.value)}
                    placeholder="e.g. My Organization Inc"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="bankAccountNumber">Account Number / IBAN</Label>
                  <Input
                    id="bankAccountNumber"
                    value={bankAccountNumber}
                    onChange={(e) => setBankAccountNumber(e.target.value)}
                    placeholder="e.g. 1234567890"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="swiftCode">SWIFT / BIC Code</Label>
                  <Input
                    id="swiftCode"
                    value={swiftCode}
                    onChange={(e) => setSwiftCode(e.target.value)}
                    placeholder="e.g. BOFAUS3N"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="bankAddress">Bank Address</Label>
                <Input
                  id="bankAddress"
                  value={bankAddress}
                  onChange={(e) => setBankAddress(e.target.value)}
                  placeholder="e.g. 123 Main St, New York, NY 10001"
                />
              </div>
              <Button onClick={handleSavePayout} disabled={updateOrg.isPending}>
                {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Building2 className="mr-2 size-4" />}
                Save payout settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify payout settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Branding & Contact</CardTitle>
          <CardDescription>Customize how your organization appears in emails and public pages</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {isAdmin ? (
            <>
              <p className="text-xs text-muted-foreground">
                These details appear in email footers and help supporters contact you.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="websiteUrl">Website URL</Label>
                  <Input
                    id="websiteUrl"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    placeholder="https://example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactEmail">Contact Email</Label>
                  <Input
                    id="contactEmail"
                    type="email"
                    value={contactEmail}
                    onChange={(e) => setContactEmail(e.target.value)}
                    placeholder="contact@example.com"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="contactPhone">Contact Phone</Label>
                  <Input
                    id="contactPhone"
                    value={contactPhone}
                    onChange={(e) => setContactPhone(e.target.value)}
                    placeholder="+1 (555) 123-4567"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="footerText">Custom Footer Text</Label>
                <Input
                  id="footerText"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="Thank you for your support!"
                />
                <p className="text-xs text-muted-foreground">
                  Custom text added to the footer of all emails sent to your supporters.
                </p>
              </div>
              <Button onClick={handleSaveBranding} disabled={updateOrg.isPending}>
                {updateOrg.isPending ? <Loader2 className="mr-2 size-4 animate-spin" /> : <Globe className="mr-2 size-4" />}
                Save branding settings
              </Button>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Only administrators can modify branding settings.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="text-base">Chat Rooms</CardTitle>
              <CardDescription>Manage chat rooms and configure tier access</CardDescription>
            </div>
            {isAdmin && (
              <Button size="sm" onClick={() => { setEditingRoom(null); setRoomDialogOpen(true); }}>
                <Plus className="mr-2 size-4" />
                New room
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {roomsLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="h-16 animate-pulse rounded-lg bg-muted" />
              ))}
            </div>
          ) : rooms && rooms.length > 0 ? (
            <div className="space-y-3">
              {rooms.map((room) => (
                <div
                  key={room.id}
                  className="flex items-center justify-between rounded-lg border p-4 transition-colors hover:bg-muted/30"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                      <MessageSquare className="size-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium truncate">{room.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {room.type === 'general' ? 'General' : room.type === 'members_only' ? 'Members only' : 'Tier restricted'}
                        {room.description ? ` \u00b7 ${room.description}` : ''}
                      </p>
                    </div>
                  </div>
                  {isAdmin && (
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleEditRoom(room)}
                        title="Edit room"
                      >
                        <Pencil className="size-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => handleDeleteRoom(room)}
                        title="Delete room"
                        className="hover:text-destructive"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-xl border border-dashed py-10 text-center">
              <MessageSquare className="mx-auto mb-3 size-8 text-muted-foreground/50" />
              <p className="text-sm font-medium text-muted-foreground">No chat rooms yet</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create chat rooms for your members to communicate.
              </p>
              {isAdmin && (
                <Button
                  variant="outline"
                  size="sm"
                  className="mt-4"
                  onClick={() => { setEditingRoom(null); setRoomDialogOpen(true); }}
                >
                  <Plus className="mr-2 size-4" />
                  Create your first room
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <CreateRoomDialog
        open={roomDialogOpen}
        onOpenChange={(open) => { setRoomDialogOpen(open); if (!open) setEditingRoom(null); }}
        onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom}
        isSubmitting={createRoom.isPending || updateRoom.isPending}
        editingRoom={editingRoom}
        tiers={tiers ?? []}
      />
    </div>
  );
}
