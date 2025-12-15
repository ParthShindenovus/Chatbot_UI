import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";
import { cn } from "@/lib/utils";

interface MessageRendererProps {
  content: string;
  isUser?: boolean;
}

export function MessageRenderer({ content, isUser = false }: MessageRendererProps) {
  return (
    <div className={cn(
      "prose prose-sm dark:prose-invert max-w-none text-xs sm:text-sm",
      isUser && "prose-invert text-white" // Force white text for user messages to ensure email visibility
    )}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          p: ({ children }) => <p className={cn("mb-1.5 sm:mb-2 last:mb-0 leading-relaxed", isUser && "text-white")}>{children}</p>,
          h1: ({ children }) => (
            <h1 className={cn("text-lg sm:text-xl font-bold mb-1.5 sm:mb-2 mt-3 sm:mt-4", isUser && "text-white")}>{children}</h1>
          ),
          h2: ({ children }) => (
            <h2 className={cn("text-base sm:text-lg font-semibold mb-1.5 sm:mb-2 mt-2 sm:mt-3", isUser && "text-white")}>{children}</h2>
          ),
          h3: ({ children }) => (
            <h3 className={cn("text-sm sm:text-base font-semibold mb-1 sm:mb-1 mt-1.5 sm:mt-2", isUser && "text-white")}>{children}</h3>
          ),
          ul: ({ children }) => (
            <ul className={cn("list-disc list-inside mb-1.5 sm:mb-2 space-y-0.5 sm:space-y-1", isUser && "text-white")}>{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className={cn("list-decimal list-inside mb-1.5 sm:mb-2 space-y-0.5 sm:space-y-1", isUser && "text-white")}>{children}</ol>
          ),
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            return isInline ? (
              <code
                className={cn(
                  "bg-muted px-1 sm:px-1.5 py-0.5 rounded text-[10px] sm:text-sm font-mono",
                  isUser && "bg-white/20 text-white"
                )}
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
            <pre className={cn("bg-muted p-2 sm:p-3 rounded-lg overflow-x-auto mb-1.5 sm:mb-2 text-[10px] sm:text-xs", isUser && "bg-white/20 text-white")}>
              {children}
            </pre>
          ),
          a: ({ href, children }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "underline hover:opacity-80 break-words",
                isUser ? "text-white" : "text-primary"
              )}
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

