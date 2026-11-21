'use client';

import { useRef } from 'react';

export function OtpInput({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = value.split('').concat(Array(6).fill('')).slice(0, 6);

  function setDigit(index: number, digit: string) {
    const next = [...digits];
    next[index] = digit.replace(/\D/g, '').slice(-1);
    onChange(next.join('').slice(0, 6));
    if (digit && index < 5) refs.current[index + 1]?.focus();
  }

  return (
    <div className="otp-row">
      {digits.map((digit, index) => (
        <input
          key={index}
          ref={(element) => {
            refs.current[index] = element;
          }}
          inputMode="numeric"
          maxLength={1}
          autoComplete="one-time-code"
          value={digit}
          aria-label={`Digit ${index + 1}`}
          onChange={(event) => setDigit(index, event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Backspace' && !digit && index > 0) {
              refs.current[index - 1]?.focus();
            }
          }}
          onPaste={(event) => {
            const pasted = event.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            if (!pasted) return;
            event.preventDefault();
            onChange(pasted);
            refs.current[Math.min(pasted.length, 5)]?.focus();
          }}
        />
      ))}
    </div>
  );
}
