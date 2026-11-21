'use client';

import { useId, useRef, useState } from 'react';
import { apiUpload } from '@/lib/api';
import { mediaUrl } from '@/lib/format';
import { Icon } from './Icon';

export function UploadField({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
  hint?: string;
}) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function upload(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    setError('');
    try {
      const result = await apiUpload(file);
      onChange(result.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  return (
    <div className="field">
      <span>{label}</span>
      <div className="upload-row">
        <span className={`upload-thumb ${value ? '' : 'empty'}`}>
          {value ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaUrl(value)} alt="" />
          ) : (
            <Icon name="search" size={16} />
          )}
        </span>
        <div className="upload-actions">
          <input
            id={inputId}
            ref={inputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            onChange={(event) => void upload(event.target.files?.[0])}
          />
          <label htmlFor={inputId} className="btn btn-outline btn-sm">
            {busy ? 'Uploading…' : value ? 'Replace image' : 'Upload image'}
          </label>
          {value && (
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => onChange('')}>
              Remove
            </button>
          )}
        </div>
      </div>
      {hint && <small>{hint}</small>}
      {error && <small className="form-error">{error}</small>}
    </div>
  );
}
