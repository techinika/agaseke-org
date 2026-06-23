import { ChatMessage } from '@/types/room';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { format } from 'date-fns';

interface MessageBubbleProps {
  message: ChatMessage;
  isOwn: boolean;
}

export function MessageBubble({ message, isOwn }: MessageBubbleProps) {
  return (
    <div className={`flex gap-3 ${isOwn ? 'flex-row-reverse' : ''}`}>
      <Avatar size="sm">
        <AvatarFallback>
          {message.senderName.charAt(0).toUpperCase()}
        </AvatarFallback>
      </Avatar>

      <div className={`flex max-w-[75%] flex-col gap-1 ${isOwn ? 'items-end' : ''}`}>
        <div className="flex items-baseline gap-2">
          <span className="text-xs font-medium text-muted-foreground">
            {message.senderName}
          </span>
          <span className="text-[10px] text-muted-foreground/60">
            {message.createdAt?.toDate
              ? format(message.createdAt.toDate(), 'HH:mm')
              : ''}
          </span>
        </div>

        <div
          className={`rounded-2xl px-3 py-2 text-sm ${
            isOwn
              ? 'bg-primary text-primary-foreground'
              : 'bg-muted text-foreground'
          }`}
        >
          {message.content && (
            <p className="whitespace-pre-wrap break-words">{message.content}</p>
          )}
          {message.imageURL && (
            <img
              src={message.imageURL}
              alt="Shared image"
              className={`mt-1 max-w-full rounded-lg object-cover ${message.content ? '' : ''}`}
              style={{ maxHeight: 300 }}
              loading="lazy"
            />
          )}
        </div>

        {message.edited && (
          <span className="text-[10px] text-muted-foreground/50">edited</span>
        )}
      </div>
    </div>
  );
}
