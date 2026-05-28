import { useEffect, useState } from 'react';

import AppHeader from './AppHeader';
import DocumentCitationViewer from './DocumentCitationViewer';
import NotesChatPanel from './NotesChatPanel';
import NotesSourcesPanel from './NotesSourcesPanel';
import NotesWorkspaceHeader from './NotesWorkspaceHeader';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const NotebookWorkspace = ({
  user,
  initials,
  onLogout,
  onUploadClick,
  recentDocuments,
  activeDocument,
  onSelectDocument,
  searchQuery,
  onSearchQueryChange,
  searchResults,
  onSearchResultSelect,
  onSearchSubmit,
  onRenameDocument,
  onDeleteDocument,
}) => {
  const [messages, setMessages] = useState([]);
  const [question, setQuestion] = useState('');
  const [isAsking, setIsAsking] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [sourceDocuments, setSourceDocuments] = useState(() =>
    activeDocument ? [activeDocument] : []
  );
  const [isSourcePickerOpen, setIsSourcePickerOpen] = useState(false);
  const [documentTextCache, setDocumentTextCache] = useState({});
  const [citationViewer, setCitationViewer] = useState(null);

  useEffect(() => {
    setQuestion('');
    setIsAsking(false);
  }, [activeDocument?.id]);

  useEffect(() => {
    const token = localStorage.getItem('ainotes_token');

    if (!activeDocument?.id || !token) {
      setMessages([]);
      setIsLoadingHistory(false);
      return;
    }

    let isMounted = true;
    setIsLoadingHistory(true);

    const loadHistory = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/api/ai/history/${activeDocument.id}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const responseText = await response.text();
        const data = responseText ? JSON.parse(responseText) : {};

        if (!response.ok) {
          throw new Error(data.message || 'Unable to load chat history right now.');
        }

        if (!isMounted) {
          return;
        }

        setMessages(Array.isArray(data.messages) ? data.messages : []);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        setMessages([
          {
            role: 'assistant',
            content: error.message || 'Unable to load chat history right now.',
          },
        ]);
      } finally {
        if (isMounted) {
          setIsLoadingHistory(false);
        }
      }
    };

    loadHistory();

    return () => {
      isMounted = false;
    };
  }, [activeDocument?.id]);

  useEffect(() => {
    setSourceDocuments((current) => {
      const documentsById = new Map(
        recentDocuments.map((document) => [String(document.id), document])
      );
      const validCurrentSources = current
        .map((source) => documentsById.get(String(source.id)))
        .filter(Boolean);

      if (!activeDocument) {
        return validCurrentSources;
      }

      const alreadyIncluded = validCurrentSources.some(
        (source) => source.id === activeDocument.id
      );

      if (alreadyIncluded) {
        return validCurrentSources;
      }

      return [activeDocument, ...validCurrentSources];
    });
  }, [activeDocument, recentDocuments]);

  const handleAddSource = (document) => {
    setSourceDocuments((current) => {
      if (current.some((source) => source.id === document.id)) {
        return current;
      }

      return [...current, document];
    });
  };

  const handleRemoveSource = (documentId) => {
    setSourceDocuments((current) => {
      const nextSources = current.filter((source) => source.id !== documentId);

      if (activeDocument?.id === documentId) {
        onSelectDocument(nextSources[0] || null);
      }

      return nextSources;
    });
  };

  const handleOpenSource = async () => {
    if (!activeDocument?.url) {
      return;
    }

    const token = localStorage.getItem('ainotes_token');
    if (!token) {
      return;
    }

    try {
      const response = await fetch(activeDocument.url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Unable to open source document.');
      }

      const blob = await response.blob();
      const objectUrl = window.URL.createObjectURL(blob);
      window.open(objectUrl, '_blank', 'noopener,noreferrer');
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60000);
    } catch (error) {
      console.error(error);
    }
  };

  const handleAskAi = async () => {
    const trimmedQuestion = question.trim();
    const token = localStorage.getItem('ainotes_token');
    const selectedDocumentIds = sourceDocuments.map((document) => document.id).filter(Boolean);

    if (!activeDocument?.id || selectedDocumentIds.length === 0 || !trimmedQuestion || !token || isAsking) {
      return;
    }

    const userMessage = {
      role: 'user',
      content: trimmedQuestion,
    };

    setMessages((current) => [...current, userMessage]);
    setQuestion('');
    setIsAsking(true);

    try {
      const response = await fetch(`${API_BASE_URL}/api/ai/ask`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          documentId: activeDocument.id,
          documentIds: selectedDocumentIds,
          historyDocumentId: activeDocument.id,
          question: trimmedQuestion,
        }),
      });

      const responseText = await response.text();
      let data;

      try {
        data = responseText ? JSON.parse(responseText) : {};
      } catch {
        throw new Error(
          'Backend returned HTML instead of JSON. Restart the backend server and check that /api/ai/ask exists.'
        );
      }

      if (!response.ok) {
        throw new Error(data.message || 'Unable to get an AI answer right now.');
      }

      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: data.answer || 'No answer returned.',
          citations: Array.isArray(data.citations) ? data.citations : [],
          answerSegments: Array.isArray(data.answerSegments) ? data.answerSegments : [],
        },
      ]);
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error.message || 'Unable to get an AI answer right now.',
        },
      ]);
    } finally {
      setIsAsking(false);
    }
  };

  const handleOpenCitation = async (citation) => {
    if (!citation?.documentId) {
      return;
    }

    const token = localStorage.getItem('ainotes_token');
    if (!token) {
      return;
    }

    const cacheKey = String(citation.documentId);
    const cachedText = documentTextCache[cacheKey];

    if (cachedText) {
      setCitationViewer({
        ...cachedText,
        citation,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/${citation.documentId}/text`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const responseText = await response.text();
      const data = responseText ? JSON.parse(responseText) : {};

      if (!response.ok) {
        throw new Error(data.message || 'Unable to open cited document.');
      }

      const viewerData = {
        documentId: data.documentId,
        documentName: data.documentName,
        text: data.text || '',
      };

      setDocumentTextCache((current) => ({
        ...current,
        [cacheKey]: viewerData,
      }));
      setCitationViewer({
        ...viewerData,
        citation,
      });
    } catch (error) {
      setMessages((current) => [
        ...current,
        {
          role: 'assistant',
          content: error.message || 'Unable to open cited document.',
          citations: [],
          answerSegments: [],
        },
      ]);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-white px-4 py-4 text-gray-900 sm:px-5 sm:py-5 lg:h-full lg:min-h-0 lg:overflow-hidden lg:px-6">
      <NotesWorkspaceHeader
        title={activeDocument?.originalName}
        activeDocument={activeDocument}
        initials={initials}
        onUploadClick={onUploadClick}
        onRenameDocument={onRenameDocument}
        onDeleteDocument={onDeleteDocument}
      />

      <div className="mb-5">
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
      </div>

      <div className="flex flex-1 flex-col gap-4 lg:grid lg:min-h-0 lg:overflow-hidden lg:grid-cols-[300px_minmax(0,1fr)]">
        <NotesSourcesPanel
          sourceDocuments={sourceDocuments}
          availableDocuments={recentDocuments}
          activeDocument={activeDocument}
          onSelectDocument={onSelectDocument}
          onUploadClick={onUploadClick}
          isSourcePickerOpen={isSourcePickerOpen}
          onToggleSourcePicker={() => setIsSourcePickerOpen((current) => !current)}
          onAddSource={handleAddSource}
          onRemoveSource={handleRemoveSource}
        />

        <NotesChatPanel
          activeDocument={activeDocument}
          recentDocuments={sourceDocuments}
          onOpenSource={handleOpenSource}
          messages={messages}
          isLoadingHistory={isLoadingHistory}
          question={question}
          onQuestionChange={setQuestion}
          onAskAi={handleAskAi}
          onOpenCitation={handleOpenCitation}
          isAsking={isAsking}
        />
      </div>

      <DocumentCitationViewer
        viewer={citationViewer}
        onClose={() => setCitationViewer(null)}
      />
    </div>
  );
};

export default NotebookWorkspace;
