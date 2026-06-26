import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  queryDocuments,
  addDocument,
  updateDocument,
  deleteDocument,
} from '@/lib/firebase/firestore';
import { getDb } from '@/lib/firebase/client';
import { COLLECTIONS, SUBCOLLECTIONS } from '@/lib/constants';
import { Room, ChatMessage } from '@/types/room';
import {
  collection,
  query,
  orderBy,
  onSnapshot,
  limit,
} from 'firebase/firestore';

function roomsPath(orgId: string) {
  return `${COLLECTIONS.ORGANIZATIONS}/${orgId}/${SUBCOLLECTIONS.ROOMS}`;
}

function messagesPath(orgId: string, roomId: string) {
  return `${roomsPath(orgId)}/${roomId}/${SUBCOLLECTIONS.MESSAGES}`;
}

export function useRooms(orgId: string) {
  return useQuery({
    queryKey: ['rooms', orgId],
    queryFn: () =>
      queryDocuments<Room>(roomsPath(orgId), orderBy('createdAt', 'asc')),
    enabled: !!orgId,
  });
}

export function useRoomMessages(orgId: string, roomId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orgId || !roomId) {
      setMessages([]);
      setIsLoading(false);
      setError(null);
      return;
    }

    setIsLoading(true);
    setError(null);
    const db = getDb();
    const q = query(
      collection(db, messagesPath(orgId, roomId)),
      orderBy('createdAt', 'asc'),
      limit(200)
    );

    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const msgs = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            id: d.id,
            senderId: data.senderId,
            senderName: data.senderName,
            senderPhotoURL: data.senderPhotoURL ?? null,
            content: data.content,
            imageURL: data.imageURL ?? undefined,
            createdAt: data.createdAt,
            edited: data.edited ?? false,
          } as ChatMessage;
        });
        setMessages(msgs);
        setIsLoading(false);
      },
      (err) => {
        setError(err instanceof Error ? err.message : 'Failed to load messages');
        setIsLoading(false);
      }
    );

    return unsubscribe;
  }, [orgId, roomId]);

  return { messages, isLoading, error };
}

export function useSendMessage(orgId: string, roomId: string) {
  return useMutation({
    mutationFn: async (data: Omit<ChatMessage, 'id' | 'createdAt'>) => {
      if (!roomId) throw new Error('No room selected');
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== undefined)
      );
      return addDocument(messagesPath(orgId, roomId), cleanData);
    },
  });
}

export function useCreateRoom(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      name: string;
      description: string;
      type: Room['type'];
      allowedTierIds: string[];
      createdBy?: string;
    }) => {
      return addDocument(roomsPath(orgId), {
        name: data.name,
        description: data.description,
        type: data.type,
        allowedTierIds: data.allowedTierIds,
        createdBy: data.createdBy ?? '',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', orgId] });
    },
  });
}

export function useUpdateRoom(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({
      roomId,
      data,
    }: {
      roomId: string;
      data: Partial<Room>;
    }) => {
      return updateDocument(`${roomsPath(orgId)}/${roomId}`, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', orgId] });
    },
  });
}

export function useDeleteRoom(orgId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (roomId: string) => {
      return deleteDocument(`${roomsPath(orgId)}/${roomId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['rooms', orgId] });
    },
  });
}
