import { MessageSquare, Hash, Lock, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Room } from '@/types/room';

interface RoomListProps {
  rooms: Room[];
  selectedRoomId: string | null;
  onSelect: (room: Room) => void;
  onCreateClick: () => void;
  isLoading: boolean;
}

const roomTypeIcons = {
  general: MessageSquare,
  members_only: Users,
  tier_restricted: Lock,
} as const;

export function RoomList({
  rooms,
  selectedRoomId,
  onSelect,
  onCreateClick,
  isLoading,
}: RoomListProps) {
  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between border-b p-3">
        <h2 className="text-sm font-semibold">Chat Rooms</h2>
        <Button size="xs" onClick={onCreateClick}>
          New
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto p-2">
        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-10 animate-pulse rounded-lg bg-muted" />
            ))}
          </div>
        ) : rooms.length === 0 ? (
          <div className="py-8 text-center text-sm text-muted-foreground">
            <MessageSquare className="mx-auto mb-2 size-8 text-muted-foreground/50" />
            <p>No rooms yet</p>
          </div>
        ) : (
          <div className="space-y-1">
            {rooms.map((room) => {
              const Icon = roomTypeIcons[room.type] ?? Hash;
              return (
                <button
                  key={room.id}
                  onClick={() => onSelect(room)}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-colors',
                    selectedRoomId === room.id
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                  )}
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="truncate font-medium">{room.name}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
