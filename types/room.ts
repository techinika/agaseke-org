import { Timestamp } from 'firebase/firestore';
import { RoomType } from '@/lib/constants';

export interface Room {
  id: string;
  name: string;
  description: string;
  type: RoomType;
  allowedTierIds: string[];
  createdAt: Timestamp;
  createdBy: string;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  senderPhotoURL: string | null;
  content: string;
  imageURL?: string;
  createdAt: Timestamp;
  edited: boolean;
}
