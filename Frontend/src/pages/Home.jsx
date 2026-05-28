import { useEffect, useMemo, useState } from 'react';
import { Home as HomeIcon, Plus } from 'lucide-react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import DocumentUploadModal from '../components/DocumentUploadModal';
import NotebookWorkspace from '../components/home/NotebookWorkspace';
import NotebookActionModal from '../components/home/NotebookActionModal';
import WelcomeHero from '../components/home/WelcomeHero';

const navItems = [
  { label: 'Dashboard', icon: HomeIcon, to: '/dashboard' },
];

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const Home = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentsError, setDocumentsError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [notebookAction, setNotebookAction] = useState(null);
  const [notebookActionError, setNotebookActionError] = useState('');
  const [isNotebookActionSubmitting, setIsNotebookActionSubmitting] = useState(false);

  const initials = user?.fullName
    ? user.fullName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase())
        .join('')
    : 'AI';

  const hasDocuments = recentDocuments.length > 0;
  const isNotebookOpen = Boolean(activeDocument);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const searchResults = useMemo(() => {
    if (!normalizedSearchQuery) {
      return [];
    }

    return recentDocuments.filter((document) =>
      [
        document.originalName,
        document.fileName,
        document.mimeType,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()
        .includes(normalizedSearchQuery)
    );
  }, [normalizedSearchQuery, recentDocuments]);

  const handleOpenDocument = (document) => {
    if (!document?.id) {
      return;
    }

    setActiveDocument(document);
    navigate(`/notes/${document.id}`);
  };

  const handleSearchResultSelect = (document) => {
    handleOpenDocument(document);
    setSearchQuery('');
  };

  const handleSearchSubmit = () => {
    if (searchResults.length === 0) {
      return;
    }

    handleSearchResultSelect(searchResults[0]);
  };

  const closeNotebookAction = () => {
    if (isNotebookActionSubmitting) {
      return;
    }

    setNotebookAction(null);
    setNotebookActionError('');
  };

  const openRenameNotebook = (document) => {
    setNotebookAction({ type: 'rename', document });
    setNotebookActionError('');
  };

  const openDeleteNotebook = (document) => {
    setNotebookAction({ type: 'delete', document });
    setNotebookActionError('');
  };

  const replaceDocument = (updatedDocument) => {
    setRecentDocuments((current) =>
      current.map((document) =>
        String(document.id) === String(updatedDocument.id) ? updatedDocument : document
      )
    );

    setActiveDocument((current) =>
      current && String(current.id) === String(updatedDocument.id) ? updatedDocument : current
    );

    setNotebookAction((current) =>
      current?.document && String(current.document.id) === String(updatedDocument.id)
        ? { ...current, document: updatedDocument }
        : current
    );
  };

  const handleRenameNotebook = async (nextName) => {
    const document = notebookAction?.document;
    const token = localStorage.getItem('ainotes_token');

    if (!document?.id || !token) {
      setNotebookActionError('You must be signed in to rename notebooks.');
      return;
    }

    if (!nextName.trim()) {
      setNotebookActionError('Notebook name is required.');
      return;
    }

    setIsNotebookActionSubmitting(true);
    setNotebookActionError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          originalName: nextName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to rename notebook.');
      }

      replaceDocument(data.document);
      setNotebookAction(null);
    } catch (error) {
      setNotebookActionError(error.message || 'Unable to rename notebook.');
    } finally {
      setIsNotebookActionSubmitting(false);
    }
  };

  const handleDeleteNotebook = async () => {
    const document = notebookAction?.document;
    const token = localStorage.getItem('ainotes_token');

    if (!document?.id || !token) {
      setNotebookActionError('You must be signed in to delete notebooks.');
      return;
    }

    setIsNotebookActionSubmitting(true);
    setNotebookActionError('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${document.id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Unable to delete notebook.');
      }

      setRecentDocuments((current) =>
        current.filter((item) => String(item.id) !== String(document.id))
      );
      setSearchQuery('');
      setNotebookAction(null);

      if (activeDocument && String(activeDocument.id) === String(document.id)) {
        setActiveDocument(null);
        navigate('/dashboard');
      }
    } catch (error) {
      setNotebookActionError(error.message || 'Unable to delete notebook.');
    } finally {
      setIsNotebookActionSubmitting(false);
    }
  };

  const handleSelectDocument = (document) => {
    if (!document?.id) {
      setActiveDocument(null);
      navigate('/dashboard');
      return;
    }

    setActiveDocument(document);
    navigate(`/notes/${document.id}`);
  };

  const renderMainContent = () => {
    if (isNotebookOpen) {
      return (
        <div className="flex min-h-screen flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
          <div className="px-4 pt-4 sm:px-5 sm:pt-5 lg:px-6">
            <button
              type="button"
              onClick={() => handleSelectDocument(null)}
              className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400 transition hover:text-white"
            >
              AINOTES
            </button>
          </div>

          <div className="flex-1 lg:min-h-0">
            <NotebookWorkspace
              user={user}
              initials={initials}
              onLogout={onLogout}
              onUploadClick={() => setIsUploadModalOpen(true)}
              recentDocuments={recentDocuments}
              activeDocument={activeDocument}
              onSelectDocument={handleSelectDocument}
              documentsError={documentsError}
              searchQuery={searchQuery}
              onSearchQueryChange={setSearchQuery}
              searchResults={searchResults}
              onSearchResultSelect={handleSearchResultSelect}
              onSearchSubmit={handleSearchSubmit}
              onRenameDocument={openRenameNotebook}
              onDeleteDocument={openDeleteNotebook}
            />
          </div>
        </div>
      );
    }

    return (
      <WelcomeHero
        user={user}
        initials={initials}
        onLogout={onLogout}
        onUploadClick={() => setIsUploadModalOpen(true)}
        recentDocuments={recentDocuments}
        onOpenDocument={handleOpenDocument}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
        searchResults={searchResults}
        onSearchResultSelect={handleSearchResultSelect}
        onSearchSubmit={handleSearchSubmit}
        onRenameDocument={openRenameNotebook}
        onDeleteDocument={openDeleteNotebook}
      />
    );
  };

  useEffect(() => {
    const token = localStorage.getItem('ainotes_token');

    if (!token) {
      setRecentDocuments([]);
      setActiveDocument(null);
      setDocumentsError('');
      return;
    }

    let isMounted = true;

    const loadDocuments = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/documents`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await response.json();

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load documents.');
        }

        if (!isMounted) {
          return;
        }

        const documents = Array.isArray(data.documents) ? data.documents : [];
        setDocumentsError('');
        setRecentDocuments(documents);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setRecentDocuments([]);
        setActiveDocument(null);
        setDocumentsError(error.message || 'Unable to load notes right now.');
      }
    };

    loadDocuments();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (!documentId) {
      setActiveDocument(null);
      return;
    }

    const matchedDocument = recentDocuments.find(
      (document) => String(document.id) === String(documentId)
    );

    setActiveDocument(matchedDocument || null);
  }, [documentId, recentDocuments]);

  return (
    <>
      <div className={`${isNotebookOpen ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
        <div className={`flex ${isNotebookOpen ? 'min-h-screen lg:h-screen lg:overflow-hidden' : 'min-h-screen'} flex-col lg:flex-row`}>
          {!isNotebookOpen && (
            <aside className="w-full border-b border-white/10 bg-black px-4 py-5 text-white sm:px-6 sm:py-8 lg:w-[290px] lg:border-b-0 lg:border-r lg:border-r-white/10">
            <div className="flex flex-wrap items-center justify-between gap-4 lg:block">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400">AINOTES</p>
              </div>
              <button
                type="button"
                onClick={() => setIsUploadModalOpen(true)}
                className="inline-flex items-center gap-3 rounded-xl bg-black px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-900"
              >
                <Plus size={16} />
                New Note
              </button>
            </div>

            <nav className="mt-5 space-y-2 sm:mt-8 lg:mt-12">
              {navItems.map((item) => {
                const Icon = item.icon;

                return (
                  <NavLink
                    key={item.label}
                    to={item.to}
                    className={({ isActive }) =>
                      `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                        isActive
                          ? 'bg-white text-black shadow-[0_18px_30px_rgba(255,255,255,0.08)]'
                          : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                      }`
                    }
                  >
                    <Icon size={18} />
                    {item.label}
                  </NavLink>
                );
              })}
            </nav>
            </aside>
          )}

          <main className={`flex-1 ${isNotebookOpen ? 'min-h-screen lg:h-full lg:overflow-hidden' : 'overflow-hidden'} ${isNotebookOpen && hasDocuments ? 'bg-[#060606]' : 'bg-white'}`}>
            {renderMainContent()}
          </main>
        </div>
      </div>

      <DocumentUploadModal
        isOpen={isUploadModalOpen}
        onClose={() => setIsUploadModalOpen(false)}
        onUploadSuccess={(document) => {
          if (!document) {
            setIsUploadModalOpen(false);
            return;
          }

          const uploadedEntry = {
            ...document,
            uploadedAt: document.uploadedAt || Date.now(),
          };

          setActiveDocument(uploadedEntry);
          setRecentDocuments((current) => [
            uploadedEntry,
            ...current.filter((item) => item.fileName !== uploadedEntry.fileName),
          ]);
          if (uploadedEntry.id) {
            navigate(`/notes/${uploadedEntry.id}`);
          }
          setIsUploadModalOpen(false);
        }}
      />

      <NotebookActionModal
        action={notebookAction?.type}
        document={notebookAction?.document}
        errorMessage={notebookActionError}
        isSubmitting={isNotebookActionSubmitting}
        onClose={closeNotebookAction}
        onRename={handleRenameNotebook}
        onDelete={handleDeleteNotebook}
      />
    </>
  );
};

export default Home;
