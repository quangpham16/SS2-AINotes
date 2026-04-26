import { useEffect, useRef } from 'react';
import { Share2 } from 'lucide-react';

import MarkdownContent from './MarkdownContent';

const renderAssistantSegments = (message, onOpenCitation) => {
  if (!Array.isArray(message.answerSegments) || message.answerSegments.length === 0) {
    return <MarkdownContent content={message.content} />;
  }

  return (
    <div className="space-y-3">
      {message.answerSegments.map((segment, index) => (
        <div key={`${segment.text.slice(0, 24)}-${index}`} className="space-y-2">
          <MarkdownContent content={segment.text} />
          {Array.isArray(segment.citations) && segment.citations.length > 0 && (
            <div className="inline-flex flex-wrap gap-1 align-middle">
              {segment.citations.map((citation, citationIndex) => (
                <button
                  key={`${citation.documentId}-${citation.chunkIndex}-${citationIndex}`}
                  type="button"
                  onClick={() => onOpenCitation?.(citation)}
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-white/10 bg-[#202020] px-2 text-[11px] font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-[#282828] hover:text-white"
                >
                  [{citationIndex + 1}]
                </button>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const NotesChatPanel = ({
  recentDocuments,
  messages,
  isLoadingHistory,
  question,
  onQuestionChange,
  onAskAi,
  onOpenCitation,
  isAsking,
}) => {
  const sourceCount = recentDocuments.length;
  const canAsk = Boolean(sourceCount > 0 && question.trim() && !isAsking);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({
      behavior: 'smooth',
      block: 'end',
    });
  }, [messages, isLoadingHistory]);

  return (
    <section className="flex h-full min-h-0 flex-col rounded-[28px] bg-[#111111]">
      <div className="flex items-center justify-between border-b border-white/6 px-5 py-4">
        <h2 className="text-3xl">Chat</h2>
        <button
          type="button"
          className="rounded-full p-2 text-neutral-400 transition hover:bg-white/5 hover:text-white"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-5 py-5">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoadingHistory && (
            <div className="rounded-[24px] bg-[#181818] px-4 py-3 text-sm text-neutral-400">
              Loading chat history...
            </div>
          )}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[85%] rounded-[24px] px-4 py-3 text-sm leading-7 ${
                    message.role === 'user'
                      ? 'ml-auto bg-white text-black'
                      : 'bg-[#181818] text-neutral-200'
                  }`}
                >
                  {message.role === 'assistant' ? (
                    renderAssistantSegments(message, onOpenCitation)
                  ) : (
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  )}
                  {message.role === 'assistant' &&
                    !Array.isArray(message.answerSegments) &&
                    Array.isArray(message.citations) &&
                    message.citations.length > 0 && (
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-white/8 pt-3">
                        {message.citations.map((citation) => (
                          <button
                            key={`${citation.documentId}-${citation.chunkIndex}`}
                            type="button"
                            onClick={() => onOpenCitation?.(citation)}
                            className="rounded-full border border-white/10 bg-[#202020] px-3 py-1.5 text-xs font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-[#282828] hover:text-white"
                          >
                            {citation.documentName} · chunk {Number(citation.chunkIndex) + 1}
                          </button>
                        ))}
                      </div>
                    )}
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="mt-5 shrink-0 rounded-[24px] border border-white/6 bg-[#181818] px-5 py-4">
          <div className="flex items-end justify-between gap-4">
            <div className="flex-1">
              <textarea
                value={question}
                onChange={(event) => onQuestionChange(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    if (canAsk) {
                      onAskAi();
                    }
                  }
                }}
                placeholder={
                  sourceCount > 0
                    ? `Ask AI about ${sourceCount} selected source${sourceCount === 1 ? '' : 's'}...`
                    : 'Select at least one document first...'
                }
                disabled={sourceCount === 0 || isAsking}
                className="min-h-[88px] w-full resize-none bg-transparent text-lg text-white outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:text-neutral-500"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Press Enter to ask, Shift+Enter for a new line.
              </p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm text-neutral-500">
                {sourceCount} source{sourceCount === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={onAskAi}
                disabled={!canAsk}
                className="inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-500 disabled:text-neutral-800"
              >
                <Share2 size={18} />
                {isAsking ? 'Asking...' : 'Ask AI'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default NotesChatPanel;
