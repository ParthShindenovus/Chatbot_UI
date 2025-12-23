import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

export function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  const baseStyles = {
    maxWidth: '100%',
    fontSize: 'var(--widget-font-size-sm)',
    fontFamily: 'var(--widget-font-family)',
    lineHeight: 1.6,
    color: isUser ? '#ffffff' : 'var(--widget-text)',
  };

  return (
    <div style={baseStyles}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkBreaks]}
        rehypePlugins={[rehypeHighlight]}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
