import { Bell, FileText, HelpCircle, LogOut, Search, X } from 'lucide-react';
import { useState } from 'react';

const AppHeader = ({
  user,
  initials,
  onLogout,
  dark = false,
  searchValue = '',
  onSearchChange,
  searchResults = [],
  onSearchResultSelect,
  onSearchSubmit,
}) => {
  const [isSearchFocused, setIsSearchFocused] = useState(false);

  const trimmedSearchValue = searchValue.trim();
  const hasSearch = trimmedSearchValue.length > 0;
  const showSearchResults = hasSearch && isSearchFocused;

  const inputClassName = dark
    ? 'w-full rounded-full border border-white/10 bg-[#181818] py-2.5 pl-12 pr-11 text-sm text-white shadow-sm transition-all placeholder:text-neutral-500 focus:border-white focus:outline-none'
    : 'w-full rounded-full border border-neutral-300 bg-white py-2.5 pl-12 pr-11 text-sm shadow-sm transition-all focus:border-black focus:outline-none';

  const iconClassName = dark ? 'text-neutral-500' : 'text-neutral-400';
  const clearClassName = dark
    ? 'absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-500 transition hover:bg-white/5 hover:text-white'
    : 'absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1 text-neutral-400 transition hover:bg-neutral-100 hover:text-black';
  const searchMenuClassName = dark
    ? 'absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-3xl border border-white/10 bg-[#181818] p-2 shadow-2xl'
    : 'absolute left-0 right-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-3xl border border-neutral-200 bg-white p-2 shadow-2xl';
  const searchItemClassName = dark
    ? 'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-white/5'
    : 'flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left transition hover:bg-neutral-100';
  const searchIconWrapClassName = dark
    ? 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white text-black'
    : 'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-black text-white';
  const searchTitleClassName = dark ? 'block truncate text-sm font-semibold text-white' : 'block truncate text-sm font-semibold text-black';
  const searchMetaClassName = dark ? 'mt-1 block truncate text-xs text-neutral-500' : 'mt-1 block truncate text-xs text-neutral-500';
  const emptySearchClassName = dark
    ? 'px-4 py-5 text-sm text-neutral-500'
    : 'px-4 py-5 text-sm text-neutral-500';
  const actionClassName = dark ? 'transition-colors hover:text-white' : 'transition-colors hover:text-gray-900';
  const logoutClassName = dark
    ? 'inline-flex items-center gap-2 rounded-full border border-white/10 bg-[#181818] px-4 py-2 text-sm font-semibold text-neutral-200 transition hover:border-white/25 hover:bg-[#222222]'
    : 'inline-flex items-center gap-2 rounded-full border border-neutral-300 bg-white px-4 py-2 text-sm font-semibold text-neutral-800 transition hover:border-neutral-400 hover:bg-neutral-100';
  const avatarClassName = dark
    ? 'flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-black'
    : 'flex h-10 w-10 items-center justify-center rounded-full bg-black text-sm font-bold text-white';
  const nameClassName = dark ? 'text-sm font-bold text-white' : 'text-sm font-bold text-gray-900';
  const emailClassName = dark ? 'text-xs text-neutral-400' : 'text-xs text-gray-500';

  const handleSearchChange = (event) => {
    onSearchChange?.(event.target.value);
  };

  const handleSearchKeyDown = (event) => {
    if (event.key === 'Enter') {
      onSearchSubmit?.();
      setIsSearchFocused(false);
    }

    if (event.key === 'Escape') {
      onSearchChange?.('');
      setIsSearchFocused(false);
    }
  };

  const handleSelectSearchResult = (document) => {
    onSearchResultSelect?.(document);
    setIsSearchFocused(false);
  };

  return (
    <header className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-5">
      <div className="relative w-full lg:w-[400px]">
        <Search className={`absolute left-4 top-1/2 -translate-y-1/2 ${iconClassName}`} size={18} />
        <input
          type="search"
          value={searchValue}
          onChange={handleSearchChange}
          onKeyDown={handleSearchKeyDown}
          onFocus={() => setIsSearchFocused(true)}
          onBlur={() => setIsSearchFocused(false)}
          placeholder="Search your documents..."
          className={inputClassName}
        />
        {hasSearch && (
          <button
            type="button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={() => onSearchChange?.('')}
            className={clearClassName}
            aria-label="Clear search"
          >
            <X size={14} />
          </button>
        )}

        {showSearchResults && (
          <div className={searchMenuClassName}>
            {searchResults.length > 0 ? (
              searchResults.slice(0, 8).map((document) => (
                <button
                  key={document.id || document.fileName}
                  type="button"
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => handleSelectSearchResult(document)}
                  className={searchItemClassName}
                >
                  <span className={searchIconWrapClassName}>
                    <FileText size={18} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className={searchTitleClassName}>
                      {document.originalName || document.fileName}
                    </span>
                    <span className={searchMetaClassName}>
                      {document.mimeType || 'Document'}
                    </span>
                  </span>
                </button>
              ))
            ) : (
              <div className={emptySearchClassName}>
                No documents match "{trimmedSearchValue}".
              </div>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 lg:justify-end lg:gap-5">
        <div className={`flex items-center gap-5 ${dark ? 'text-slate-400' : 'text-gray-500'}`}>
          <button type="button" className={actionClassName} aria-label="Notifications">
            <Bell size={20} />
          </button>
          <button type="button" className={actionClassName} aria-label="Help">
            <HelpCircle size={20} />
          </button>
        </div>

        <div className="flex min-w-0 items-center gap-3">
          <div className="hidden min-w-0 text-right sm:block">
            <p className={nameClassName}>{user?.fullName || 'AINotes User'}</p>
            <p className={`${emailClassName} max-w-48 truncate`}>{user?.email}</p>
          </div>
          <button type="button" onClick={onLogout} className={logoutClassName}>
            <LogOut size={16} />
            Logout
          </button>
          <div className={avatarClassName}>{initials}</div>
        </div>
      </div>
    </header>
  );
};

export default AppHeader;
