import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const withoutMarkdownNode = (props) => {
  const { node: _node, ...restProps } = props;
  return restProps;
};

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
          h1: (props) => <h1 className="text-xl font-semibold text-white" {...withoutMarkdownNode(props)} />,
          h2: (props) => <h2 className="text-lg font-semibold text-white" {...withoutMarkdownNode(props)} />,
          h3: (props) => <h3 className="text-base font-semibold text-white" {...withoutMarkdownNode(props)} />,
          p: (props) => <p className="whitespace-pre-wrap" {...withoutMarkdownNode(props)} />,
          ul: (props) => <ul className="list-disc space-y-1 pl-5" {...withoutMarkdownNode(props)} />,
          ol: (props) => <ol className="list-decimal space-y-1 pl-5" {...withoutMarkdownNode(props)} />,
          li: (props) => <li className="ml-1" {...withoutMarkdownNode(props)} />,
          blockquote: (props) => (
            <blockquote
              className="border-l-2 border-white/20 pl-4 italic text-neutral-300"
              {...withoutMarkdownNode(props)}
            />
          ),
          code: ({ inline, className: codeClassName, children, ...props }) => {
            const codeProps = withoutMarkdownNode(props);

            return inline ? (
              <code
                className="rounded bg-white/8 px-1.5 py-0.5 font-mono text-[0.95em] text-neutral-100"
                {...codeProps}
              >
                {children}
              </code>
            ) : (
              <pre className="overflow-x-auto rounded-2xl bg-black/40 px-4 py-3 text-sm text-neutral-100">
                <code className={codeClassName} {...codeProps}>
                  {children}
                </code>
              </pre>
            );
          },
          a: (props) => (
            <a className="text-white underline decoration-white/40 underline-offset-4" {...withoutMarkdownNode(props)} />
          ),
          table: (props) => (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left text-sm" {...withoutMarkdownNode(props)} />
            </div>
          ),
          thead: (props) => <thead className="border-b border-white/10" {...withoutMarkdownNode(props)} />,
          tbody: (props) => <tbody {...withoutMarkdownNode(props)} />,
          tr: (props) => <tr className="border-b border-white/6" {...withoutMarkdownNode(props)} />,
          th: (props) => <th className="px-3 py-2 font-semibold text-white" {...withoutMarkdownNode(props)} />,
          td: (props) => <td className="px-3 py-2 text-neutral-200" {...withoutMarkdownNode(props)} />,
        }}
      >
        {markdown}
      </ReactMarkdown>
    </div>
  );
};

export default MarkdownContent;
