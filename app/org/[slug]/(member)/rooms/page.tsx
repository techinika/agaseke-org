'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, ArrowLeft } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { RoomList } from '@/components/rooms/room-list';
import { ChatView } from '@/components/rooms/chat-view';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { useRooms, useRoomMessages, useSendMessage, useCreateRoom } from '@/hooks/use-rooms';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { Room } from '@/types/room';
import { toast } from 'sonner';

export default function RoomsPage() {
  const { slug } = useParams<{ slug: string }>();
  const { user } = useAuthStore();
  const { data: org } = useOrganizationBySlug(slug);
  const orgId = org?.id ?? '';

  const { data: rooms, isLoading: roomsLoading } = useRooms(orgId);
  const [selectedRoom, setSelectedRoom] = useState<Room | null>(null);

  const { messages, isLoading: messagesLoading } = useRoomMessages(
    orgId,
    selectedRoom?.id ?? null
  );

  const sendMessage = useSendMessage(orgId, selectedRoom?.id ?? '');
  const createRoom = useCreateRoom(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [showMobileList, setShowMobileList] = useState(true);

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

  async function handleCreateRoom(data: {
    name: string;
    description: string;
    type: Room['type'];
    allowedTierIds: string[];
  }) {
    try {
      await createRoom.mutateAsync(data);
      toast.success('Room created');
      setDialogOpen(false);
    } catch {
      toast.error('Failed to create room');
    }
  }

  function handleSelectRoom(room: Room) {
    setSelectedRoom(room);
    setShowMobileList(false);
  }

  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      <PageHeader
        title="Chat Rooms"
        description="Communicate with your members"
        className="px-1 pb-4"
      />

      <div className="flex flex-1 overflow-hidden rounded-xl border">
        <div className={`w-full shrink-0 border-r bg-muted/30 sm:w-64 ${showMobileList ? 'block' : 'hidden sm:block'}`}>
          {!showMobileList && selectedRoom && (
            <button
              onClick={() => setShowMobileList(true)}
              className="flex items-center gap-1.5 border-b p-3 text-sm font-medium text-muted-foreground hover:text-foreground sm:hidden"
            >
              <ArrowLeft className="size-4" />
              All rooms
            </button>
          )}
          <RoomList
            rooms={rooms ?? []}
            selectedRoomId={selectedRoom?.id ?? null}
            onSelect={handleSelectRoom}
            onCreateClick={() => setDialogOpen(true)}
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

      <CreateRoomDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSubmit={handleCreateRoom}
        isSubmitting={createRoom.isPending}
      />
    </div>
  );
}
