import Link from 'next/link';

export function Logo({
  compact = false,
  href = '/',
  light = false,
}: {
  compact?: boolean;
  href?: string;
  light?: boolean;
}) {
  return (
    <Link href={href} className={`logo ${light ? 'logo-light' : ''}`} aria-label="UNIRIDE UNISTAY home">
      <span className="logo-mark" aria-hidden="true">
        <span className="logo-mark-half" />
        <span className="logo-mark-dot" />
      </span>
      {!compact && (
        <span className="logo-word">
          uniride <span className="logo-slash">/</span> unistay
        </span>
      )}
    </Link>
  );
}
