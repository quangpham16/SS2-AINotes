import { Clock3, FileText, Pencil, Plus, Trash2 } from 'lucide-react';

import AppHeader from './AppHeader';
import { formatFileSize, formatUploadedAt } from './utils';

const WelcomeHero = ({
  user,
  initials,
  onLogout,
  onUploadClick,
  recentDocuments,
  onOpenDocument,
  searchQuery = '',
  onSearchQueryChange,
  searchResults = [],
  onSearchResultSelect,
  onSearchSubmit,
  onRenameDocument,
  onDeleteDocument,
}) => {
  const trimmedSearchQuery = searchQuery.trim();
  const documentsToShow = trimmedSearchQuery ? searchResults : recentDocuments;
  const hasVisibleDocuments = documentsToShow.length > 0;

  return (
    <div className="px-4 py-5 sm:px-6 sm:py-8 lg:px-10 lg:py-10">
      <AppHeader
        user={user}
        initials={initials}
        onLogout={onLogout}
        searchValue={searchQuery}
        onSearchChange={onSearchQueryChange}
        searchResults={searchResults}
        onSearchResultSelect={onSearchResultSelect}
        onSearchSubmit={onSearchSubmit}
      />

      <section className="mt-6 overflow-hidden rounded-[24px] border border-neutral-200 bg-black p-5 shadow-[0_30px_80px_rgba(0,0,0,0.10)] sm:mt-8 sm:rounded-[32px] sm:p-8 lg:rounded-[36px] lg:bg-white lg:p-12">
        <div className="max-w-3xl">
          <p className="text-xs font-bold uppercase tracking-[0.35em] text-white lg:text-black">Welcome</p>
          <h1 className="mt-4 text-3xl font-bold leading-tight text-white sm:text-4xl lg:text-black">
            AI study notes, source organization, and a smarter workspace for your documents.
          </h1>
          <p className="mt-5 text-base leading-7 text-neutral-300 sm:text-lg sm:leading-8 lg:text-neutral-600">
            AINOTES helps students upload course files, keep sources organized, and prepare for AI-powered note generation. Start by uploading your first document from the New Note button.
          </p>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
            <button
              type="button"
              onClick={onUploadClick}
              className="inline-flex items-center justify-center gap-3 rounded-full bg-white px-6 py-4 text-sm font-semibold text-black transition hover:bg-neutral-200"
            >
              <Plus size={18} />
              Upload Your Document
            </button>
            <div className="inline-flex items-center justify-center gap-3 rounded-full border border-neutral-300 bg-white px-5 py-4 text-sm font-semibold text-neutral-700">
              <FileText size={18} className="text-black" />
              Supports PDF, DOC, DOCX, TXT
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-[24px] border border-neutral-200 bg-white/90 p-4 sm:mt-10 sm:rounded-[32px] sm:p-6">
          <div className="flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-center">
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.3em] text-neutral-500">Recent Documents</p>
              <h2 className="mt-2 break-words text-xl font-bold text-black sm:text-2xl">
                {trimmedSearchQuery ? `Search results for "${trimmedSearchQuery}"` : 'Your latest uploads'}
              </h2>
            </div>
            <div className="inline-flex shrink-0 items-center gap-2 rounded-full bg-black px-4 py-2 text-sm font-semibold text-white">
              <Clock3 size={16} />
              {documentsToShow.length} document{documentsToShow.length === 1 ? '' : 's'}
            </div>
          </div>

          {hasVisibleDocuments ? (
            <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {documentsToShow.slice(0, trimmedSearchQuery ? 12 : 6).map((document) => (
                <div
                  key={document.fileName}
                  className="group relative rounded-[24px] border border-neutral-200 bg-white p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-[0_18px_40px_rgba(0,0,0,0.10)] sm:rounded-[28px] sm:p-6"
                >
                  <div className="absolute right-4 top-4 flex gap-2">
                    <button
                      type="button"
                      onClick={() => onRenameDocument?.(document)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 shadow-sm transition hover:border-neutral-300 hover:text-black"
                      aria-label={`Rename ${document.originalName || 'notebook'}`}
                      title="Rename notebook"
                    >
                      <Pencil size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteDocument?.(document)}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-red-100 bg-red-50 text-red-500 shadow-sm transition hover:border-red-200 hover:bg-red-100"
                      aria-label={`Delete ${document.originalName || 'notebook'}`}
                      title="Delete notebook"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => onOpenDocument(document)}
                    className="block w-full pr-16 text-left"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black text-white">
                      <FileText size={20} />
                    </div>
                    <p className="mt-5 truncate text-lg font-semibold text-black">
                      {document.originalName}
                    </p>
                    <p className="mt-2 text-sm text-neutral-500">
                      Uploaded {formatUploadedAt(document.uploadedAt)}
                    </p>
                    <p className="mt-1 text-sm text-neutral-500">
                      {formatFileSize(document.size)}
                    </p>
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <div className="mt-6 rounded-[28px] border border-dashed border-neutral-300 bg-neutral-50 p-6">
              <p className="text-lg font-semibold text-black">
                {trimmedSearchQuery ? 'No matching documents' : 'No recent documents yet'}
              </p>
              <p className="mt-2 text-neutral-600">
                {trimmedSearchQuery
                  ? `No uploads match "${trimmedSearchQuery}".`
                  : 'Upload a file and it will appear here on the dashboard.'}
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default WelcomeHero;
