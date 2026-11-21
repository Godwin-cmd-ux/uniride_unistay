'use client';

import { useUniversity } from '@/context/university';

export function UniversitySelect({ compact = false }: { compact?: boolean }) {
  const { universities, selected, select, loading } = useUniversity();

  return (
    <label className={`uni-select ${compact ? 'uni-select-compact' : ''}`}>
      <span className="uni-select-icon" aria-hidden="true">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
          <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
          <circle cx="12" cy="10" r="2.5" />
        </svg>
      </span>
      {!compact && <span className="uni-select-label">Campus</span>}
      <select
        aria-label="Select your university"
        value={selected?.id ?? ''}
        onChange={(event) => {
          const match = universities.find((university) => university.id === event.target.value);
          if (match) select(match);
        }}
        disabled={loading || universities.length === 0}
      >
        {universities.length === 0 && <option value="">Loading campuses…</option>}
        {universities.map((university) => (
          <option key={university.id} value={university.id}>
            {university.shortName} — {university.city}
          </option>
        ))}
      </select>
    </label>
  );
}
