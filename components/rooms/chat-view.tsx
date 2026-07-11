'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Hash, Lock, Users, ImagePlus, Loader2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { EmptyState } from '@/components/shared/empty-state';
import { MessageBubble } from './message-bubble';
import { Room, ChatMessage } from '@/types/room';
import { useAuthStore } from '@/store/auth-store';
import { WORKERS } from '@/lib/workers';
import { encryptMessage, decryptMessage } from '@/lib/encryption';

interface ChatViewProps {
  room: Room | null;
  messages: ChatMessage[];
  isMessagesLoading: boolean;
  onSendMessage: (content: string, imageURL?: string) => Promise<void>;
  isSending: boolean;
}

const roomTypeLabels = {
  general: 'General',
  members_only: 'Members only',
  tier_restricted: 'Tier restricted',
};

const roomTypeIcons = {
  general: Hash,
  members_only: Users,
  tier_restricted: Lock,
};

export function ChatView({
  room,
  messages,
  isMessagesLoading,
  onSendMessage,
  isSending,
}: ChatViewProps) {
  const { user } = useAuthStore();
  const [input, setInput] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingImage, setPendingImage] = useState<{ file: File; preview: string } | null>(null);

  const [decryptedMessages, setDecryptedMessages] = useState<Record<string, string>>({});
  const decryptedRef = useRef(new Set<string>());

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (!room || !user) return;
    let cancelled = false;
    for (const msg of messages) {
      if (msg.content && !decryptedRef.current.has(msg.id)) {
        decryptMessage(msg.content, room.id, user.uid).then((decrypted) => {
          if (!cancelled) {
            decryptedRef.current.add(msg.id);
            setDecryptedMessages((prev) => ({ ...prev, [msg.id]: decrypted }));
          }
        });
      }
    }
    return () => { cancelled = true; };
  }, [messages, room, user]);

  useEffect(() => {
    return () => {
      if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    };
  }, [pendingImage]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = input.trim();
    if ((!trimmed && !pendingImage) || isSending || !room || !user) return;

    let imageURL: string | undefined;
    if (pendingImage) {
      setIsUploading(true);
      setUploadError(null);
      try {
        const formData = new FormData();
        formData.append('file', pendingImage.file);
        formData.append('folder', 'chat');
        const res = await fetch(`${WORKERS.uploads.url}/upload`, { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        imageURL = data.url;
      } catch {
        setUploadError('Image upload failed');
        setIsUploading(false);
        return;
      }
      setIsUploading(false);
    }

    const encrypted = trimmed ? await encryptMessage(trimmed, room.id, user.uid) : '';

    setInput('');
    setPendingImage(null);
    setUploadError(null);
    await onSendMessage(encrypted, imageURL);
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage({
      file,
      preview: URL.createObjectURL(file),
    });
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function removePendingImage() {
    if (pendingImage) URL.revokeObjectURL(pendingImage.preview);
    setPendingImage(null);
    setUploadError(null);
  }

  if (!room) {
    return (
      <div className="flex h-full items-center justify-center">
        <EmptyState
          icon={Hash}
          title="Select a room"
          description="Choose a chat room from the sidebar to start conversing."
        />
      </div>
    );
  }

  const Icon = roomTypeIcons[room.type] ?? Hash;

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-center gap-3 border-b px-4 py-3">
        <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10">
          <Icon className="size-4 text-primary" />
        </div>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">{room.name}</h2>
          <p className="text-[11px] text-muted-foreground">
            {roomTypeLabels[room.type]}
            {room.description && ` · ${room.description}`}
          </p>
        </div>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-4 overflow-y-auto p-4">
        {isMessagesLoading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex gap-3">
                <Skeleton className="size-6 shrink-0 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-24" />
                  <Skeleton className="h-16 w-64 rounded-2xl" />
                </div>
              </div>
            ))}
          </div>
        ) : messages.length === 0 ? (
          <EmptyState
            icon={Hash}
            title="No messages yet"
            description="Be the first to send a message in this room."
          />
        ) : (
          messages.map((msg) => (
            <MessageBubble
              key={msg.id}
              message={{ ...msg, content: decryptedMessages[msg.id] ?? msg.content }}
              isOwn={user?.uid === msg.senderId}
            />
          ))
        )}
      </div>

      <form onSubmit={handleSend} className="border-t p-3">
        {pendingImage && (
          <div className="mb-2 flex items-center gap-2 rounded-lg bg-muted p-2">
            <img
              src={pendingImage.preview}
              alt="Upload preview"
              className="size-10 rounded object-cover"
            />
            <span className="flex-1 truncate text-xs text-muted-foreground">
              {pendingImage.file.name}
            </span>
            <button
              type="button"
              onClick={removePendingImage}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="size-4" />
            </button>
          </div>
        )}
        {uploadError && (
          <p className="mb-2 text-xs text-destructive">{uploadError}</p>
        )}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/jpg,image/gif,image/webp"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Button
            type="button"
            size="icon"
            variant="ghost"
            disabled={isUploading}
            onClick={() => fileInputRef.current?.click()}
            className="shrink-0"
          >
            {isUploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <ImagePlus className="size-4" />
            )}
          </Button>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={`Message #${room.name}...`}
            className="flex-1"
            disabled={isSending || isUploading}
          />
          <Button
            type="submit"
            size="icon"
            disabled={(!input.trim() && !pendingImage) || isSending || isUploading}
          >
            <Send className="size-4" />
          </Button>
        </div>
      </form>
    </div>
  );
}
