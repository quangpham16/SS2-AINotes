import { Book, Pencil, Plus, Trash2 } from 'lucide-react';

const NotesWorkspaceHeader = ({
  title,
  activeDocument,
  onUploadClick,
  onRenameDocument,
  onDeleteDocument,
}) => {
  return (
    <header className="mb-4 flex flex-col gap-4 rounded-[24px] bg-[#111111] px-4 py-4 shadow-[0_20px_45px_rgba(0,0,0,0.22)] sm:px-5 lg:mb-5 lg:flex-row lg:items-center lg:justify-between lg:rounded-[28px]">
      <div className="flex min-w-0 items-start gap-3 sm:items-center sm:gap-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white text-black sm:h-12 sm:w-12">
          <Book size={24} />
        </div>
        <div className="min-w-0">
          <h1 className="break-words text-xl font-semibold leading-7 text-white sm:text-2xl">
            {title || 'AINotes Workspace'}
          </h1>
          <p className="mt-1 text-sm text-neutral-400">
            Upload, organize, and study your course materials in one place.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-[44px_44px_minmax(0,1fr)] gap-3 sm:flex sm:flex-wrap sm:items-center">
        {activeDocument && (
          <>
            <button
              type="button"
              onClick={() => onRenameDocument?.(activeDocument)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/10 bg-[#181818] text-neutral-200 transition hover:border-white/20 hover:bg-[#242424] hover:text-white"
              aria-label="Rename notebook"
              title="Rename notebook"
            >
              <Pencil size={16} />
            </button>
            <button
              type="button"
              onClick={() => onDeleteDocument?.(activeDocument)}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-red-400/20 bg-red-500/10 text-red-200 transition hover:border-red-300/40 hover:bg-red-500/20 hover:text-white"
              aria-label="Delete notebook"
              title="Delete notebook"
            >
              <Trash2 size={16} />
            </button>
          </>
        )}
        <button
          type="button"
          onClick={onUploadClick}
          className="inline-flex min-w-0 items-center justify-center gap-2 rounded-full bg-white px-4 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 sm:px-5"
        >
          <Plus size={16} />
          <span className="truncate">Create notebook</span>
        </button>
      </div>
    </header>
  );
};

export default NotesWorkspaceHeader;
