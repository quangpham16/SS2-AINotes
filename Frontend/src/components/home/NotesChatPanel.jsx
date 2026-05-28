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
                  className="inline-flex h-6 min-w-6 items-center justify-center rounded-full border border-neutral-200 bg-white px-2 text-[11px] font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-black"
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
    <section className="flex h-[calc(100svh-2rem)] min-h-[560px] flex-col rounded-[24px] border border-neutral-200 bg-white shadow-sm lg:h-full lg:min-h-0 lg:rounded-[28px]">
      <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-4 sm:px-5">
        <h2 className="text-2xl text-black sm:text-3xl">Chat</h2>
        <button
          type="button"
          className="rounded-full p-2 text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
        />
      </div>

      <div className="flex min-h-0 flex-1 flex-col px-4 py-4 sm:px-5 sm:py-5">
        <div className="min-h-0 flex-1 overflow-y-auto pr-1">
          {isLoadingHistory && (
            <div className="rounded-[24px] bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
              Loading chat history...
            </div>
          )}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((message, index) => (
                <div
                  key={`${message.role}-${index}`}
                  className={`max-w-[92%] rounded-[22px] px-4 py-3 text-sm leading-7 sm:max-w-[85%] sm:rounded-[24px] ${
                    message.role === 'user'
                      ? 'ml-auto bg-[#e8f0fe] text-black'
                      : 'bg-neutral-100 text-neutral-900'
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
                      <div className="mt-4 flex flex-wrap gap-2 border-t border-neutral-200 pt-3">
                        {message.citations.map((citation) => (
                          <button
                            key={`${citation.documentId}-${citation.chunkIndex}`}
                            type="button"
                            onClick={() => onOpenCitation?.(citation)}
                            className="rounded-full border border-neutral-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-700 transition hover:border-neutral-300 hover:bg-neutral-50 hover:text-black"
                          >
                            {citation.documentName} - chunk {Number(citation.chunkIndex) + 1}
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

        <div className="mt-4 shrink-0 rounded-[22px] border border-neutral-200 bg-neutral-50 px-4 py-4 sm:mt-5 sm:rounded-[24px] sm:px-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
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
                className="min-h-[88px] w-full resize-none bg-transparent text-base text-black outline-none placeholder:text-neutral-500 disabled:cursor-not-allowed disabled:text-neutral-400 sm:text-lg"
              />
              <p className="mt-2 text-xs text-neutral-500">
                Press Enter to ask, Shift+Enter for a new line.
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-4">
              <span className="text-sm text-neutral-500">
                {sourceCount} source{sourceCount === 1 ? '' : 's'}
              </span>
              <button
                type="button"
                onClick={onAskAi}
                disabled={!canAsk}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-black px-5 py-3 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 sm:w-auto"
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
