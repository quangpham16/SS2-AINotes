import { useEffect, useMemo, useRef } from 'react';
import { X } from 'lucide-react';

const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const DocumentCitationViewer = ({ viewer, onClose }) => {
  const highlightRef = useRef(null);
  const text = viewer?.text || '';
  const excerpt = viewer?.citation?.excerpt || '';

  const renderedContent = useMemo(() => {
    if (!text) {
      return null;
    }

    if (!excerpt || !text.includes(excerpt)) {
      return <span>{text}</span>;
    }

    const parts = text.split(new RegExp(`(${escapeRegExp(excerpt)})`, 'g'));

    return parts.map((part, index) => {
      if (part !== excerpt) {
        return <span key={`${part.slice(0, 20)}-${index}`}>{part}</span>;
      }

      return (
        <mark
          key={`highlight-${index}`}
          ref={highlightRef}
          className="rounded-lg bg-amber-300 px-1.5 py-0.5 text-black"
        >
          {part}
        </mark>
      );
    });
  }, [excerpt, text]);

  useEffect(() => {
    highlightRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'center',
    });
  }, [viewer]);

  if (!viewer) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-[#060606] text-white lg:absolute lg:z-30">
      <div className="flex flex-col gap-4 border-b border-white/8 px-4 py-4 sm:px-6 sm:py-5 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-neutral-500">
            Citation View
          </p>
          <h2 className="mt-2 break-words text-xl font-semibold sm:text-2xl">{viewer.documentName}</h2>
          <p className="mt-1 text-sm text-neutral-400">
            Highlighting cited passage from chunk {Number(viewer.citation?.chunkIndex ?? 0) + 1}
          </p>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="inline-flex w-full items-center justify-center gap-2 rounded-full border border-white/10 bg-[#181818] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-[#222222] sm:w-auto"
        >
          <X size={16} />
          Exit document view
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6 sm:py-6">
        <div className="mx-auto max-w-5xl rounded-[22px] border border-white/8 bg-[#111111] p-4 shadow-[0_25px_60px_rgba(0,0,0,0.35)] sm:rounded-[28px] sm:p-6">
          <div className="mb-5 rounded-[20px] border border-white/8 bg-[#181818] px-4 py-3 text-sm leading-7 text-neutral-300">
            <span className="font-semibold text-white">Cited excerpt:</span> {excerpt}
          </div>

          <article className="whitespace-pre-wrap text-sm leading-8 text-neutral-200">
            {renderedContent}
          </article>
        </div>
      </div>
    </div>
  );
};

export default DocumentCitationViewer;
