'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import PublicOrgHeader from '@/components/shared/public-org-header';
import PublicOrgFooter from '@/components/shared/public-org-footer';
import { RoomList } from '@/components/rooms/room-list';
import { ChatView } from '@/components/rooms/chat-view';
import { useRooms, useRoomMessages, useSendMessage } from '@/hooks/use-rooms';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useUserMembership } from '@/hooks/use-memberships';
import { Room } from '@/types/room';
import { toast } from 'sonner';

export default function PublicChatPage() {
  const { slug } = useParams<{ slug: string }>();
  const router = useRouter();
  const { user } = useAuthStore();
  const { data: org, isLoading: orgLoading } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';
  const { data: membership, isLoading: membershipLoading } = useUserMembership(orgId, user?.uid ?? '');
  const isMember = !!membership && membership.status === 'active';

  const { data: rooms, isLoading: roomsLoading } = useRooms(orgId);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const { messages, isLoading: messagesLoading } = useRoomMessages(
    orgId,
    selectedRoom?.id ?? null
  );

  const sendMessage = useSendMessage(orgId, selectedRoom?.id ?? '');

  async function handleSendMessage(content: string, imageURL?: string) {
    if (!user || !selectedRoom) return;
    await sendMessage.mutateAsync({
      senderId: user.uid,
      senderName: user.displayName || 'Anonymous',
      senderPhotoURL: user.photoURL,
      content,
      imageURL,
      edited: false,
    });
  }

  function handleSelectRoom(room: Room) {
    setSelectedRoom(room);
    setShowMobileList(false);
  }

  if (orgLoading || membershipLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <div className="mx-auto max-w-6xl px-4 py-12">
          <Skeleton className="h-96 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!org) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center px-4">
        <MessageSquare className="mb-6 size-16 text-muted-foreground/50" />
        <h1 className="text-2xl font-bold">Organization not found</h1>
        <p className="mt-2 text-muted-foreground">This organization doesn&apos;t exist.</p>
        <Button variant="outline" className="mt-6" onClick={() => router.push('/')}>Go home</Button>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
          <MessageSquare className="mb-6 size-16 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Sign in required</h1>
          <p className="mt-2 text-muted-foreground">Please sign in to access chat rooms.</p>
          <Button className="mt-6" onClick={() => router.push(`/auth/login?redirect=/org/${slug}/chat`)}>
            Sign in
          </Button>
        </div>
        <PublicOrgFooter orgName={org.name} />
      </div>
    );
  }

  if (!isMember) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
        <PublicOrgHeader org={org} slug={slug} />
        <div className="mx-auto flex max-w-lg flex-col items-center justify-center px-4 py-24 text-center">
          <MessageSquare className="mb-6 size-16 text-muted-foreground/50" />
          <h1 className="text-2xl font-bold">Members only</h1>
          <p className="mt-2 text-muted-foreground">
            You need to be a member of {org.name} to access chat rooms.
          </p>
          <Button className="mt-6" onClick={() => router.push(`/org/${slug}/join`)}>
            Join {org.name}
          </Button>
        </div>
        <PublicOrgFooter orgName={org.name} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/[0.02]">
      <PublicOrgHeader org={org} slug={slug} />
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {!showMobileList && selectedRoom && (
          <button
            onClick={() => setShowMobileList(true)}
            className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
          >
            <ArrowLeft className="size-4" />
            All rooms
          </button>
        )}
        <div className="flex h-[calc(100vh-12rem)] overflow-hidden rounded-xl border">
          <div className={`w-full shrink-0 border-r bg-muted/30 sm:w-64 ${showMobileList ? 'block' : 'hidden sm:block'}`}>
            <RoomList
              rooms={rooms ?? []}
              selectedRoomId={selectedRoom?.id ?? null}
              onSelect={handleSelectRoom}
              onCreateClick={() => toast.info('Create rooms from the admin panel')}
              isLoading={roomsLoading}
            />
          </div>
          <div className={`flex-1 ${showMobileList ? 'hidden sm:block' : 'block'}`}>
            <ChatView
              room={selectedRoom}
              messages={messages}
              isMessagesLoading={messagesLoading}
              onSendMessage={handleSendMessage}
              isSending={sendMessage.isPending}
            />
          </div>
        </div>
      </div>
      <PublicOrgFooter orgName={org.name} />
    </div>
  );
}
