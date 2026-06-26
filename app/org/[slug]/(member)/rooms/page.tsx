'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import { MessageSquare, ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { RoomList } from '@/components/rooms/room-list';
import { ChatView } from '@/components/rooms/chat-view';
import { CreateRoomDialog } from '@/components/rooms/create-room-dialog';
import { useRooms, useRoomMessages, useSendMessage, useCreateRoom, useUpdateRoom, useDeleteRoom } from '@/hooks/use-rooms';
import { useOrganizationBySlug } from '@/hooks/use-organization';
import { useAuthStore } from '@/store/auth-store';
import { useTiers } from '@/hooks/use-tiers';
import { Room } from '@/types/room';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';

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
  const updateRoom = useUpdateRoom(orgId);
  const deleteRoom = useDeleteRoom(orgId);
  const { data: tiers } = useTiers(orgId);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingRoom, setEditingRoom] = useState<Room | null>(null);
  const [showMobileList, setShowMobileList] = useState(true);

  const isAdmin = org?.adminIds?.includes(user?.uid ?? '');

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
      setDialogOpen(false);
      setEditingRoom(null);
    } catch {
      toast.error('Failed to update room');
    }
  }

  async function handleDeleteRoom(room: Room) {
    if (!confirm(`Delete "${room.name}"? This cannot be undone.`)) return;
    try {
      await deleteRoom.mutateAsync(room.id);
      if (selectedRoom?.id === room.id) setSelectedRoom(null);
      toast.success('Room deleted');
    } catch {
      toast.error('Failed to delete room');
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
            onCreateClick={() => {
              setEditingRoom(null);
              setDialogOpen(true);
            }}
            isLoading={roomsLoading}
          />
        </div>

        <div className={`flex flex-1 flex-col ${showMobileList ? 'hidden sm:block' : 'block'}`}>
          {selectedRoom && (
            <div className="flex items-center justify-between border-b px-3 py-1.5">
              <button
                onClick={() => { setSelectedRoom(null); setShowMobileList(true); }}
                className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
                title="All rooms"
              >
                <ArrowLeft className="size-3.5" />
                All rooms
              </button>
              {isAdmin && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => {
                      setEditingRoom(selectedRoom);
                      setDialogOpen(true);
                    }}
                    title="Edit room"
                  >
                    <Pencil className="size-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => handleDeleteRoom(selectedRoom)}
                    title="Delete room"
                    className="hover:text-destructive"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>
              )}
            </div>
          )}
          <div className="flex-1">
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

      <CreateRoomDialog
        open={dialogOpen}
        onOpenChange={(open) => { setDialogOpen(open); if (!open) setEditingRoom(null); }}
        onSubmit={editingRoom ? handleUpdateRoom : handleCreateRoom}
        isSubmitting={createRoom.isPending || updateRoom.isPending}
        editingRoom={editingRoom}
        tiers={tiers ?? []}
      />
    </div>
  );
}
