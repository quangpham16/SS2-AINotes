import {
  Check,
  ChevronDown,
  FileText,
  LayoutGrid,
  LayoutList,
  LogOut,
  Plus,
  Search,
  UserRound,
  X,
} from 'lucide-react';
import { useState } from 'react';

import AppLogoMark from './AppLogoMark';

const sortLabels = {
  title: 'Title',
  recent: 'Recent',
};

const DashboardHeader = ({
  user,
  onLogout,
  onUploadClick,
  searchValue = '',
  onSearchChange,
  searchResults = [],
  onSearchResultSelect,
  onSearchSubmit,
  sortMode = 'title',
  onSortModeChange,
  viewMode = 'grid',
  onViewModeChange,
}) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [isSortOpen, setIsSortOpen] = useState(false);

  const trimmedSearchValue = searchValue.trim();
  const showSearchField = isSearchOpen || trimmedSearchValue.length > 0;
  const showSearchResults = showSearchField && trimmedSearchValue.length > 0 && isSearchFocused;

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      onSearchSubmit?.();
      setIsSearchFocused(false);
    }

    if (event.key === 'Escape') {
      onSearchChange?.('');
      setIsSearchOpen(false);
      setIsSearchFocused(false);
    }
  };

  const handleSearchResultSelect = (document) => {
    onSearchResultSelect?.(document);
    setIsSearchOpen(false);
    setIsSearchFocused(false);
  };

  const closeMenuOnBlur = (setter) => (event) => {
    if (!event.currentTarget.contains(event.relatedTarget)) {
      setter(false);
    }
  };

  return (
    <header className="border-b border-neutral-100 bg-white px-4 pb-5 pt-3 sm:px-6 lg:px-10">
      <div className="flex items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <AppLogoMark className="h-7 w-7 text-black" />
          <span className="truncate text-[2rem] font-semibold leading-none text-black">
            AINotes
          </span>
        </div>

        <div className="flex min-w-0 items-center gap-2">
          <div className="hidden min-w-0 items-center gap-2 rounded-full border border-neutral-200 bg-white py-2 pl-2 pr-4 shadow-sm sm:flex">
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-black text-white">
              <UserRound size={15} />
            </span>
            <span className="max-w-52 truncate text-sm font-semibold text-neutral-800">
              {user?.email || 'AINotes User'}
            </span>
          </div>

          <button
            type="button"
            onClick={onLogout}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-full border border-neutral-200 bg-white px-4 text-sm font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-300 hover:bg-neutral-50"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-4 lg:mt-11 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex items-center gap-6 overflow-x-auto">
          <button
            type="button"
            className="inline-flex h-14 min-w-14 items-center justify-center rounded-full border border-neutral-300 bg-[#f0f2fb] px-5 text-base font-medium text-neutral-900 shadow-sm"
          >
            All
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="relative">
            {showSearchField ? (
              <div className="relative w-full sm:w-80">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-500" size={20} />
                <input
                  autoFocus
                  type="search"
                  value={searchValue}
                  onChange={(event) => onSearchChange?.(event.target.value)}
                  onKeyDown={handleSearchKeyDown}
                  onFocus={() => setIsSearchFocused(true)}
                  onBlur={() => setIsSearchFocused(false)}
                  placeholder="Search notebooks"
                  className="h-14 w-full rounded-full border border-neutral-300 bg-white pl-12 pr-12 text-base text-black shadow-sm outline-none transition focus:border-neutral-500"
                />
                <button
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => {
                    onSearchChange?.('');
                    setIsSearchOpen(false);
                  }}
                  className="absolute right-3 top-1/2 inline-flex h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full text-neutral-500 transition hover:bg-neutral-100 hover:text-black"
                  aria-label="Close search"
                >
                  <X size={17} />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="inline-flex h-14 w-14 items-center justify-center rounded-full border border-neutral-300 bg-white text-neutral-700 shadow-sm transition hover:border-neutral-400 hover:text-black"
                aria-label="Search notebooks"
                title="Search notebooks"
              >
                <Search size={25} />
              </button>
            )}

            {showSearchResults && (
              <div className="absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
                {searchResults.length > 0 ? (
                  searchResults.slice(0, 8).map((document) => (
                    <button
                      key={document.id || document.fileName}
                      type="button"
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => handleSearchResultSelect(document)}
                      className="flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left transition hover:bg-neutral-100"
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white">
                        <FileText size={18} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-semibold text-black">
                          {document.originalName || document.fileName}
                        </span>
                        <span className="mt-1 block truncate text-xs text-neutral-500">
                          {document.mimeType || 'Document'}
                        </span>
                      </span>
                    </button>
                  ))
                ) : (
                  <div className="px-4 py-5 text-sm text-neutral-500">
                    No notebooks match "{trimmedSearchValue}".
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="inline-grid h-14 grid-cols-3 overflow-hidden rounded-full border border-neutral-300 bg-white shadow-sm">
            <button
              type="button"
              className="inline-flex w-14 items-center justify-center bg-[#f0f2fb] text-neutral-900"
              aria-label="Select notebooks"
              title="Select notebooks"
            >
              <Check size={23} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.('grid')}
              className={`inline-flex w-14 items-center justify-center border-l border-neutral-300 transition ${
                viewMode === 'grid'
                  ? 'bg-[#f0f2fb] text-neutral-900'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50 hover:text-black'
              }`}
              aria-label="Grid view"
              title="Grid view"
            >
              <LayoutGrid size={23} />
            </button>
            <button
              type="button"
              onClick={() => onViewModeChange?.('list')}
              className={`inline-flex w-14 items-center justify-center border-l border-neutral-300 transition ${
                viewMode === 'list'
                  ? 'bg-[#f0f2fb] text-neutral-900'
                  : 'bg-white text-neutral-700 hover:bg-neutral-50 hover:text-black'
              }`}
              aria-label="List view"
              title="List view"
            >
              <LayoutList size={23} />
            </button>
          </div>

          <div
            className="relative"
            onBlur={closeMenuOnBlur(setIsSortOpen)}
          >
            <button
              type="button"
              onClick={() => setIsSortOpen((current) => !current)}
              className="inline-flex h-14 min-w-32 items-center justify-center gap-2 rounded-full border border-neutral-300 bg-white px-6 text-base font-semibold text-neutral-900 shadow-sm transition hover:border-neutral-400 hover:bg-neutral-50"
              aria-haspopup="menu"
              aria-expanded={isSortOpen}
            >
              {sortLabels[sortMode] || 'Title'}
              <ChevronDown size={18} />
            </button>

            {isSortOpen && (
              <div className="absolute right-0 top-full z-30 mt-2 w-44 rounded-2xl border border-neutral-200 bg-white p-2 shadow-xl">
                {Object.entries(sortLabels).map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => {
                      onSortModeChange?.(value);
                      setIsSortOpen(false);
                    }}
                    className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition ${
                      sortMode === value
                        ? 'bg-neutral-100 text-black'
                        : 'text-neutral-600 hover:bg-neutral-50 hover:text-black'
                    }`}
                  >
                    {label}
                    {sortMode === value && <Check size={16} />}
                  </button>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={onUploadClick}
            className="inline-flex h-14 items-center justify-center gap-3 rounded-full bg-black px-7 text-base font-semibold text-white shadow-sm transition hover:bg-neutral-800"
          >
            <Plus size={21} />
            Create new
          </button>
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;
