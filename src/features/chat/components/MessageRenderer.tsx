import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkBreaks from "remark-breaks";
import rehypeHighlight from "rehype-highlight";

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

// Custom link component that opens in new tab
const LinkComponent = ({ href, children, ...props }: any) => {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        color: 'var(--widget-primary)',
        textDecoration: 'underline',
        fontWeight: '500',
        cursor: 'pointer',
      }}
      className="widget-message-link"
      {...props}
    >
      {children}
    </a>
  );
};

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
        components={{
          a: LinkComponent,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
