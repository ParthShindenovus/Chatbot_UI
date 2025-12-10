import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

interface MessageRendererProps {
  content: string;
}

export function MessageRenderer({ content }: MessageRendererProps) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => <p className="mb-1.5 sm:mb-2 last:mb-0 leading-relaxed">{children}</p>,
          h1: ({ children }) => (
            <h1 className="text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 mt-3 sm:mt-4">{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 mt-2 sm:mt-3">{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm sm:text-base font-semibold mb-1 sm:mb-1 mt-1.5 sm:mt-2">{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-1.5 sm:mb-2 space-y-0.5 sm:space-y-1">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-1.5 sm:mb-2 space-y-0.5 sm:space-y-1">{children}</ol>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className="bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-sm font-mono"
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
            <pre className="bg-muted p-2 sm:p-3 rounded-lg overflow-x-auto mb-1.5 sm:mb-2 text-[10px] sm:text-xs">
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:text-primary/80 break-words"
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

