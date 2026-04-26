import { useEffect, useState } from 'react';
import { Home as HomeIcon, Plus } from 'lucide-react';
import { NavLink, useNavigate, useParams } from 'react-router-dom';
import DocumentUploadModal from '../components/DocumentUploadModal';
import NotebookWorkspace from '../components/home/NotebookWorkspace';
import WelcomeHero from '../components/home/WelcomeHero';

const navItems = [
  { label: 'Dashboard', icon: HomeIcon, to: '/dashboard' },
];

const API_BASE_URL = 'http://localhost:5000';

const Home = ({ user, onLogout }) => {
  const navigate = useNavigate();
  const { documentId } = useParams();
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [recentDocuments, setRecentDocuments] = useState([]);
  const [activeDocument, setActiveDocument] = useState(null);
  const [documentsError, setDocumentsError] = useState('');

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

  const handleOpenDocument = (document) => {
    if (!document?.id) {
      return;
    }

    setActiveDocument(document);
    navigate(`/notes/${document.id}`);
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
        <div className="flex h-full min-h-0 flex-col overflow-hidden">
          <div className="px-5 pt-5 lg:px-6">
            <button
              type="button"
              onClick={() => handleSelectDocument(null)}
              className="text-xs font-bold uppercase tracking-[0.4em] text-neutral-400 transition hover:text-white"
            >
              AINOTES
            </button>
          </div>

          <div className="min-h-0 flex-1">
            <NotebookWorkspace
              user={user}
              initials={initials}
              onLogout={onLogout}
              onUploadClick={() => setIsUploadModalOpen(true)}
              recentDocuments={recentDocuments}
              activeDocument={activeDocument}
              onSelectDocument={handleSelectDocument}
              documentsError={documentsError}
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
      <div className={`${isNotebookOpen ? 'h-screen overflow-hidden' : 'min-h-screen'} bg-white text-gray-900`}>
        <div className={`flex ${isNotebookOpen ? 'h-screen overflow-hidden' : 'min-h-screen'} flex-col lg:flex-row`}>
          {!isNotebookOpen && (
            <aside className="w-full border-b border-white/10 bg-black px-6 py-8 text-white lg:w-[290px] lg:border-b-0 lg:border-r lg:border-r-white/10">
            <div className="flex items-center justify-between lg:block">
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

            <nav className="mt-8 space-y-2 lg:mt-12">
              {navItems.map(({ label, icon: Icon, to }) => (
                <NavLink
                  key={label}
                  to={to}
                  className={({ isActive }) =>
                    `flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-left text-sm font-semibold transition ${
                      isActive
                        ? 'bg-white text-black shadow-[0_18px_30px_rgba(255,255,255,0.08)]'
                        : 'text-neutral-400 hover:bg-white/5 hover:text-white'
                    }`
                  }
                >
                  <Icon size={18} />
                  {label}
                </NavLink>
              ))}
            </nav>
            </aside>
          )}

          <main className={`flex-1 ${isNotebookOpen ? 'h-full overflow-hidden' : 'overflow-hidden'} ${isNotebookOpen && hasDocuments ? 'bg-[#060606]' : 'bg-white'}`}>
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
    </>
  );
};

export default Home;
