import { FileText, PanelLeft, Plus, Search, X } from 'lucide-react';
import { useMemo, useState } from 'react';

import { formatFileSize, formatUploadedAt } from './utils';

const NotesSourcesPanel = ({
  sourceDocuments,
  availableDocuments,
  activeDocument,
  onSelectDocument,
  onUploadClick,
  isSourcePickerOpen,
  onToggleSourcePicker,
  onAddSource,
  onRemoveSource,
}) => {
  const [searchQuery, setSearchQuery] = useState('');

  const normalizedQuery = searchQuery.trim().toLowerCase();

  const addableDocuments = useMemo(
    () =>
      availableDocuments.filter(
        (document) => !sourceDocuments.some((source) => source.id === document.id)
      ),
    [availableDocuments, sourceDocuments]
  );

  const filteredSourceDocuments = useMemo(() => {
    if (!normalizedQuery) {
      return sourceDocuments;
    }

    return sourceDocuments.filter((document) =>
      `${document.originalName || ''} ${document.fileName || ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [normalizedQuery, sourceDocuments]);

  const filteredAddableDocuments = useMemo(() => {
    if (!normalizedQuery) {
      return addableDocuments;
    }

    return addableDocuments.filter((document) =>
      `${document.originalName || ''} ${document.fileName || ''}`.toLowerCase().includes(normalizedQuery)
    );
  }, [addableDocuments, normalizedQuery]);

  const hasSearchResults =
    filteredSourceDocuments.length > 0 || filteredAddableDocuments.length > 0;

  return (
    <section className="max-h-[460px] overflow-y-auto rounded-[24px] bg-[#111111] lg:h-full lg:max-h-none lg:min-h-0 lg:rounded-[28px]">
      <div className="flex items-center justify-between border-b border-white/6 px-4 py-4 sm:px-5">
        <h2 className="text-2xl sm:text-3xl">Sources</h2>
        <PanelLeft size={18} className="text-neutral-400" />
      </div>

      <div className="space-y-5 px-4 py-4 sm:px-5 sm:py-5">
        <label className="flex items-center gap-3 rounded-full border border-white/10 bg-[#1C1C1C] px-4 py-3 text-sm text-neutral-300 transition focus-within:border-white/20">
          <Search size={16} className="text-neutral-500" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search documents"
            className="w-full bg-transparent text-sm text-white outline-none placeholder:text-neutral-500"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              className="rounded-full p-1 text-neutral-500 transition hover:bg-white/5 hover:text-white"
              aria-label="Clear search"
            >
              <X size={14} />
            </button>
          )}
        </label>

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onToggleSourcePicker}
            className="flex flex-1 items-center justify-center gap-3 rounded-full border border-white/10 bg-[#1C1C1C] px-4 py-4 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-[#242424]"
          >
            <Plus size={16} />
            {isSourcePickerOpen ? 'Hide uploads' : 'Add sources'}
          </button>
          <button
            type="button"
            onClick={onUploadClick}
            className="rounded-full border border-white/10 bg-[#1C1C1C] px-4 py-4 text-sm font-semibold text-neutral-200 transition hover:border-white/20 hover:bg-[#242424]"
          >
            Upload
          </button>
        </div>

        <div>
          <p className="mb-3 text-sm font-semibold text-neutral-400">Selected sources</p>
          <div className="space-y-3">
            {filteredSourceDocuments.map((document) => (
              <div
                key={document.id || document.fileName}
                className={`flex items-center gap-3 rounded-2xl px-3 py-3 transition ${
                  activeDocument?.fileName === document.fileName
                    ? 'bg-[#2A2A2A]'
                    : 'bg-transparent hover:bg-[#1C1C1C]'
                }`}
              >
                <div className="pointer-events-none flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
                  <FileText size={18} />
                </div>
                <button
                  type="button"
                  onClick={() => onSelectDocument(document)}
                  className="min-w-0 flex-1 text-left"
                >
                  <p className="truncate text-sm font-semibold text-white">
                    {document.originalName}
                  </p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {formatFileSize(document.size)} - {formatUploadedAt(document.uploadedAt)}
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => onRemoveSource(document.id)}
                  className="shrink-0 rounded-full p-2 text-neutral-500 transition hover:bg-white/5 hover:text-white"
                  aria-label={`Remove ${document.originalName || 'source'}`}
                >
                  <X size={16} />
                </button>
              </div>
            ))}
            {sourceDocuments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
                No sources selected. Add the documents you want to ask about.
              </div>
            )}
            {sourceDocuments.length > 0 && filteredSourceDocuments.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
                No selected sources match "{searchQuery}".
              </div>
            )}
          </div>
        </div>

        {isSourcePickerOpen && (
          <div>
            <p className="mb-3 text-sm font-semibold text-neutral-400">Your uploaded documents</p>
            <div className="space-y-3">
              {filteredAddableDocuments.map((document) => (
                <button
                  key={document.id || document.fileName}
                  type="button"
                  onClick={() => onAddSource(document)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-white/10 bg-[#181818] px-3 py-3 text-left transition hover:border-white/20 hover:bg-[#1F1F1F]"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white text-black">
                    <FileText size={18} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-white">
                      {document.originalName}
                    </p>
                    <p className="mt-1 text-xs text-neutral-500">
                      {formatFileSize(document.size)} - {formatUploadedAt(document.uploadedAt)}
                    </p>
                  </div>
                  <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
                    Add
                  </span>
                </button>
              ))}
              {addableDocuments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
                  All uploaded documents are already in your sources.
                </div>
              )}
              {addableDocuments.length > 0 && filteredAddableDocuments.length === 0 && (
                <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
                  No uploaded documents match "{searchQuery}".
                </div>
              )}
            </div>
          </div>
        )}

        {normalizedQuery && !hasSearchResults && !isSourcePickerOpen && sourceDocuments.length === 0 && (
          <div className="rounded-2xl border border-dashed border-white/10 px-4 py-6 text-sm text-neutral-500">
            No documents match "{searchQuery}".
          </div>
        )}
      </div>
    </section>
  );
};

export default NotesSourcesPanel;
