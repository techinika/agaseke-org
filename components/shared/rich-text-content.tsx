interface RichTextContentProps {
  html: string;
  className?: string;
}

export function RichTextContent({ html, className = '' }: RichTextContentProps) {
  if (!html) return null;

  return (
    <div
      className={`prose prose-sm dark:prose-invert max-w-none prose-headings:font-bold prose-a:text-primary prose-a:underline prose-a:underline-offset-2 prose-img:rounded-lg prose-img:max-h-96 prose-img:w-auto prose-video:rounded-lg prose-video:max-w-full [&_.ProseMirror]:outline-none ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
