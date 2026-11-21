'use client';

import { useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import { Icon } from './Icon';

export type PendingDocument = {
  type: 'LICENSE' | 'NATIONAL_ID' | 'VEHICLE_INSURANCE';
  fileUrl: string;
  expiresAt: string;
};

const docTypes: { value: PendingDocument['type']; label: string }[] = [
  { value: 'LICENSE', label: 'Driving licence' },
  { value: 'NATIONAL_ID', label: 'National ID (NIDA)' },
  { value: 'VEHICLE_INSURANCE', label: 'Vehicle insurance' },
];

export function DocumentUploads({
  documents,
  onChange,
}: {
  documents: PendingDocument[];
  onChange: (documents: PendingDocument[]) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [type, setType] = useState<PendingDocument['type']>('LICENSE');
  const [fileUrl, setFileUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiUpload(file);
      setFileUrl(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  }

  function add() {
    if (!fileUrl) {
      setError('Upload the document image first');
      return;
    }
    onChange([...documents, { type, fileUrl, expiresAt }]);
    setFileUrl('');
    setExpiresAt('');
    setError('');
  }

  return (
    <div className="document-uploads">
      <div className="form-grid form-grid-3">
        <label className="field">
          <span>Document type</span>
          <select value={type} onChange={(event) => setType(event.target.value as PendingDocument['type'])}>
            {docTypes.map((doc) => (
              <option key={doc.value} value={doc.value}>
                {doc.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Expiry date</span>
          <input type="date" value={expiresAt} onChange={(event) => setExpiresAt(event.target.value)} />
        </label>
        <div className="field">
          <span>Image</span>
          <input
            ref={fileRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            id="doc-file"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <div className="inline">
            <label htmlFor="doc-file" className="btn btn-outline btn-sm">
              {busy ? 'Uploading…' : fileUrl ? 'Change file' : 'Choose image'}
            </label>
            {fileUrl && (
              <span className="badge badge-success">
                <Icon name="check" size={12} /> Uploaded
              </span>
            )}
          </div>
        </div>
      </div>
      {error && <p className="form-error mt-8">{error}</p>}
      <button type="button" className="btn btn-soft btn-sm mt-16" onClick={add}>
        <Icon name="plus" size={14} /> Add document
      </button>

      {documents.length > 0 && (
        <div className="doc-list mt-16">
          {documents.map((doc, index) => (
            <div className="doc-row" key={`${doc.type}-${index}`}>
              <span className="badge badge-success">
                <Icon name="check" size={12} /> Ready
              </span>
              <strong>{docTypes.find((item) => item.value === doc.type)?.label}</strong>
              <span>{doc.expiresAt ? `expires ${doc.expiresAt}` : 'no expiry'}</span>
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                onClick={() => onChange(documents.filter((_, i) => i !== index))}
              >
                Remove
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
