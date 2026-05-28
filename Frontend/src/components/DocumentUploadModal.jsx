import { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

const formatFileSize = (sizeInBytes) => {
  if (!Number.isFinite(sizeInBytes) || sizeInBytes <= 0) {
    return '0 KB';
  }

  if (sizeInBytes < 1024 * 1024) {
    return `${Math.max(sizeInBytes / 1024, 0.1).toFixed(1)} KB`;
  }

  return `${(sizeInBytes / (1024 * 1024)).toFixed(2)} MB`;
};

const DocumentUploadModal = ({ isOpen, onClose, onUploadSuccess }) => {
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadMessage, setUploadMessage] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  if (!isOpen) {
    return null;
  }

  const handleFileChange = (event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFile(file);
    setUploadMessage('');
  };

  const resetState = () => {
    setSelectedFile(null);
    setUploadMessage('');
    setIsUploading(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleClose = () => {
    resetState();
    onClose();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadMessage('Select a document before uploading.');
      return;
    }

    const token = localStorage.getItem('ainotes_token');

    if (!token) {
      setUploadMessage('You must be signed in to upload documents.');
      return;
    }

    const formData = new FormData();
    formData.append('document', selectedFile);

    setIsUploading(true);
    setUploadMessage('');

    try {
      const response = await fetch(`${API_BASE_URL}/api/documents/upload`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Upload failed.');
      }

      setUploadMessage(data.message || 'Document uploaded successfully.');
      if (onUploadSuccess) {
        onUploadSuccess(data.document || null);
      }
      handleClose();
    } catch (error) {
      setUploadMessage(error.message || 'Cannot upload document right now.');
      setIsUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/45 px-4 py-4 backdrop-blur-sm sm:py-8">
      <div className="max-h-[calc(100svh-2rem)] w-full max-w-2xl overflow-y-auto rounded-[24px] border border-white/10 bg-[#101010] text-white shadow-[0_30px_80px_rgba(0,0,0,0.45)] sm:rounded-[32px]">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-5 sm:px-8">
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-[0.35em] text-neutral-400">New Note</p>
            <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">Upload a document</h2>
            <p className="mt-2 text-sm leading-6 text-neutral-400">
              Choose a PDF, DOC, DOCX, or TXT file. The backend accepts files up to 10MB.
            </p>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-[#181818] text-neutral-400 transition hover:text-white"
          >
            <X size={18} />
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-8 sm:py-8">
          <label className="flex cursor-pointer flex-col items-start justify-between gap-4 rounded-3xl border border-dashed border-white/20 bg-[#181818] px-5 py-5 transition hover:border-white/40 sm:flex-row sm:items-center">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-white">
                {selectedFile ? selectedFile.name : 'Choose a document'}
              </p>
              <p className="mt-1 text-xs text-neutral-400">
                {selectedFile
                  ? `${selectedFile.type || 'Unknown type'} - ${formatFileSize(selectedFile.size)}`
                  : 'Allowed: PDF, DOC, DOCX, TXT'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3 text-black">
              <FileText size={18} />
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.doc,.docx,.txt"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>

          {uploadMessage && (
            <div className="rounded-2xl border border-white/10 bg-[#181818] px-4 py-3 text-sm text-neutral-200">
              {uploadMessage}
            </div>
          )}

          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={handleClose}
              className="inline-flex items-center justify-center rounded-2xl border border-white/10 bg-[#181818] px-5 py-3 text-sm font-semibold text-neutral-200 transition hover:bg-[#222222]"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleUpload}
              disabled={isUploading}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-black transition hover:bg-neutral-200 disabled:cursor-not-allowed disabled:bg-neutral-500"
            >
              <Upload size={18} />
              {isUploading ? 'Uploading...' : 'Upload Document'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DocumentUploadModal;
