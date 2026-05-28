import { useState } from 'react';
import { Pencil, Trash2, X } from 'lucide-react';

const NotebookActionModal = ({
  action,
  document,
  errorMessage,
  isSubmitting,
  onClose,
  onRename,
  onDelete,
}) => {
  if (!action || !document) {
    return null;
  }

  return (
    <NotebookActionModalContent
      key={`${action}-${document.id || document.fileName}`}
      action={action}
      document={document}
      errorMessage={errorMessage}
      isSubmitting={isSubmitting}
      onClose={onClose}
      onRename={onRename}
      onDelete={onDelete}
    />
  );
};

const NotebookActionModalContent = ({
  action,
  document,
  errorMessage,
  isSubmitting,
  onClose,
  onRename,
  onDelete,
}) => {
  const [notebookName, setNotebookName] = useState(document?.originalName || '');

  const isRename = action === 'rename';
  const title = isRename ? 'Rename notebook' : 'Delete notebook';
  const Icon = isRename ? Pencil : Trash2;
  const trimmedName = notebookName.trim();

  const handleSubmit = (event) => {
    event.preventDefault();

    if (isRename) {
      onRename(trimmedName);
      return;
    }

    onDelete();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:py-8">
      <form
        onSubmit={handleSubmit}
        className="max-h-[calc(100svh-2rem)] w-full max-w-xl overflow-y-auto rounded-[24px] border border-neutral-200 bg-white text-black shadow-[0_30px_80px_rgba(0,0,0,0.18)] sm:rounded-[32px]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-neutral-200 px-5 py-5 sm:px-8">
          <div className="flex min-w-0 items-start gap-3 sm:gap-4">
            <div className="mt-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-black text-white sm:h-11 sm:w-11">
              <Icon size={18} />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-400">
                Notebook
              </p>
              <h2 className="mt-2 text-xl font-bold text-black sm:text-2xl">{title}</h2>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-neutral-200 bg-white text-neutral-500 transition hover:bg-neutral-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
          {isRename ? (
            <label className="block">
              <span className="text-sm font-semibold text-neutral-700">Notebook name</span>
              <input
                type="text"
                value={notebookName}
                onChange={(event) => setNotebookName(event.target.value)}
                maxLength={180}
                autoFocus
                className="mt-3 w-full rounded-2xl border border-neutral-200 bg-white px-4 py-3 text-sm text-black outline-none transition placeholder:text-neutral-500 focus:border-neutral-400"
              />
            </label>
          ) : (
            <div className="rounded-3xl border border-neutral-200 bg-neutral-50 px-5 py-5">
              <p className="text-sm font-semibold text-black">{document.originalName}</p>
              <p className="mt-2 text-sm leading-6 text-neutral-600">
                This removes the notebook, uploaded file, generated chunks, and saved chat history.
                This cannot be undone.
              </p>
            </div>
          )}

          {errorMessage && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {errorMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="inline-flex items-center justify-center rounded-2xl border border-neutral-200 bg-white px-5 py-3 text-sm font-semibold text-neutral-700 transition hover:bg-neutral-50 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || (isRename && !trimmedName)}
              className={`inline-flex items-center justify-center gap-2 rounded-2xl px-5 py-3 text-sm font-semibold transition disabled:cursor-not-allowed disabled:bg-neutral-200 disabled:text-neutral-400 ${
                isRename
                  ? 'bg-black text-white hover:bg-neutral-800'
                  : 'bg-red-500 text-white hover:bg-red-400'
              }`}
            >
              <Icon size={18} />
              {isSubmitting
                ? isRename
                  ? 'Saving...'
                  : 'Deleting...'
                : title}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default NotebookActionModal;
