'use client';

export function Stars({ value, size = 12 }: { value: number; size?: number }) {
  const rounded = Math.round(value);
  return (
    <span className="stars" style={{ fontSize: size }} aria-label={`${value} out of 5`}>
      {'★★★★★'.slice(0, rounded)}
      <span style={{ opacity: 0.28 }}>{'★★★★★'.slice(rounded)}</span>
    </span>
  );
}

export function StarPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (value: number) => void;
}) {
  return (
    <div className="star-picker" role="radiogroup" aria-label="Rating">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          role="radio"
          aria-checked={value === star}
          className={star <= value ? 'active' : ''}
          onClick={() => onChange(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
