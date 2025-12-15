import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

export function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  const baseStyles = {
    maxWidth: 'none',
    fontSize: 'var(--widget-font-size-sm)',
    fontFamily: 'var(--widget-font-family)',
    lineHeight: 1.6,
    color: isUser ? '#ffffff' : 'var(--widget-text)',
  };

  return (
    <div style={baseStyles}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => (
            <p style={{ 
              marginBottom: '0.375rem', 
              lineHeight: 1.6,
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </p>
          ),
          h1: ({ children }) => (
            <h1 style={{ 
              fontSize: 'var(--widget-font-size-lg)', 
              fontWeight: 700, 
              marginBottom: '0.375rem', 
              marginTop: '0.75rem',
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 style={{ 
              fontSize: 'var(--widget-font-size-base)', 
              fontWeight: 600, 
              marginBottom: '0.375rem', 
              marginTop: '0.5rem',
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 style={{ 
              fontSize: 'var(--widget-font-size-sm)', 
              fontWeight: 600, 
              marginBottom: '0.25rem', 
              marginTop: '0.375rem',
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </h3>
          ),
          ul: ({ children }) => (
            <ul style={{ 
              listStyle: 'disc', 
              listStylePosition: 'inside', 
              marginBottom: '0.375rem', 
              paddingLeft: '0',
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol style={{ 
              listStyle: 'decimal', 
              listStylePosition: 'inside', 
              marginBottom: '0.375rem',
              paddingLeft: '0',
              color: isUser ? '#ffffff' : 'var(--widget-text)'
            }}>
              {children}
            </ol>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                style={{
                  background: isUser ? 'rgba(255, 255, 255, 0.2)' : 'var(--widget-muted)',
                  padding: '0.125rem 0.375rem',
                  borderRadius: 'var(--widget-radius-sm)',
                  fontSize: 'var(--widget-font-size-xs)',
                  fontFamily: 'monospace',
                  color: isUser ? '#ffffff' : 'var(--widget-text)',
                }}
                {...props}
              >
                {children}
              </code>
            ) : (
              <code className={className} {...props}>
                {children}
              </code>
            );
          },
          pre: ({ children }) => (
            <pre style={{ 
              background: isUser ? 'rgba(255, 255, 255, 0.2)' : 'var(--widget-muted)', 
              padding: '0.5rem', 
              borderRadius: 'var(--widget-radius-lg)', 
              overflowX: 'auto', 
              marginBottom: '0.375rem',
              fontSize: 'var(--widget-font-size-xs)',
              color: isUser ? '#ffffff' : 'var(--widget-text)',
            }}>
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                textDecoration: 'underline',
                color: isUser ? '#ffffff' : 'var(--widget-primary)',
                wordBreak: 'break-word',
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.opacity = '0.8';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.opacity = '1';
              }}
            >
              {children}
            </a>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
