import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const MarkdownContent = ({ content, className = '' }) => {
  const markdown = String(content || '').trim();

  if (!markdown) {
    return null;
  }

  return (
    <div className={`markdown-content space-y-3 ${className}`.trim()}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ node, ...props }) => <h1 className="text-xl font-semibold text-white" {...props} />,
          h2: ({ node, ...props }) => <h2 className="text-lg font-semibold text-white" {...props} />,
          h3: ({ node, ...props }) => <h3 className="text-base font-semibold text-white" {...props} />,
          p: ({ node, ...props }) => <p className="whitespace-pre-wrap" {...props} />,
          ul: ({ node, ...props }) => <ul className="list-disc space-y-1 pl-5" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal space-y-1 pl-5" {...props} />,
          li: ({ node, ...props }) => <li className="ml-1" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote
              className="border-l-2 border-white/20 pl-4 italic text-neutral-300"
              {...props}
            />
          ),
          code: ({ inline, className: codeClassName, children, ...props }) =>
            inline ? (
              <code
                className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.95em] text-neutral-100"
                {...props}
              >
                {children}
              </code>
            ) : (
              <pre className="overflow-x-auto rounded-2xl bg-black/40 px-4 py-3 text-sm text-neutral-100">
                <code className={codeClassName} {...props}>
                  {children}
                </code>
              </pre>
            ),
          a: ({ node, ...props }) => (
            <a className="text-white underline decoration-white/40 underline-offset-4" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm" {...props} />
            </div>
          ),
          thead: ({ node, ...props }) => <thead className="border-b border-white/10" {...props} />,
          tbody: ({ node, ...props }) => <tbody {...props} />,
          tr: ({ node, ...props }) => <tr className="border-b border-white/6" {...props} />,
          th: ({ node, ...props }) => <th className="px-3 py-2 font-semibold text-white" {...props} />,
          td: ({ node, ...props }) => <td className="px-3 py-2 text-neutral-200" {...props} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
