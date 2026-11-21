import type { ReactNode, SVGProps } from 'react';

export type IconName =
  | 'home'
  | 'bed'
  | 'bike'
  | 'bell'
  | 'user'
  | 'users'
  | 'shield'
  | 'building'
  | 'wallet'
  | 'star'
  | 'pin'
  | 'arrow-right'
  | 'arrow-left'
  | 'check'
  | 'close'
  | 'plus'
  | 'menu'
  | 'logout'
  | 'search'
  | 'calendar'
  | 'phone'
  | 'mail'
  | 'chat'
  | 'alert'
  | 'key'
  | 'clock'
  | 'route'
  | 'info'
  | 'chevron-down'
  | 'spark';

const paths: Record<IconName, ReactNode> = {
  home: <path d="M3 10.5 12 3l9 7.5V21h-6v-6H9v6H3z" />,
  bed: (
    <>
      <path d="M3 7v13M3 16h18v4M3 12h18v4M7 12V9h5v3" />
      <circle cx="17" cy="10" r="2" />
    </>
  ),
  bike: (
    <>
      <circle cx="5.5" cy="17" r="3.5" />
      <circle cx="18.5" cy="17" r="3.5" />
      <path d="M5.5 17 9 8h4l4 9M12 17h3M9 8h5" />
    </>
  ),
  bell: <path d="M18 8a6 6 0 1 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" />,
  user: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </>
  ),
  users: (
    <>
      <circle cx="9" cy="8" r="3.5" />
      <path d="M2.5 20c0-3.5 3-5.5 6.5-5.5s6.5 2 6.5 5.5M16 5a3.5 3.5 0 0 1 0 7M18 20c0-2.5-1-4-2.5-5" />
    </>
  ),
  shield: <path d="M12 3 5 6v5c0 5 3.5 8.5 7 10 3.5-1.5 7-5 7-10V6zM9 12l2 2 4-4" />,
  building: (
    <>
      <path d="M4 21V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v16M16 9h3a1 1 0 0 1 1 1v11" />
      <path d="M8 7h4M8 11h4M8 15h4M2 21h20" />
    </>
  ),
  wallet: (
    <>
      <path d="M3 7a2 2 0 0 1 2-2h13v4H5a2 2 0 0 1-2-2ZM3 7v11a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1V9H5" />
      <circle cx="16.5" cy="14" r="1.2" />
    </>
  ),
  star: <path d="m12 3 2.8 5.7 6.2.9-4.5 4.4 1 6.2L12 17.3 6.5 20.2l1-6.2L3 9.6l6.2-.9z" />,
  pin: (
    <>
      <path d="M12 22s7-6.2 7-12a7 7 0 1 0-14 0c0 5.8 7 12 7 12Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  'arrow-right': <path d="M4 12h16M14 6l6 6-6 6" />,
  'arrow-left': <path d="M20 12H4M10 6l-6 6 6 6" />,
  check: <path d="m4 12 5 5L20 6" />,
  close: <path d="M6 6l12 12M18 6 6 18" />,
  plus: <path d="M12 4v16M4 12h16" />,
  menu: <path d="M3 6h18M3 12h18M3 18h18" />,
  logout: <path d="M9 3H4v18h5M15 7l5 5-5 5M20 12H9" />,
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </>
  ),
  calendar: (
    <>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M8 3v4M16 3v4M3 10h18" />
    </>
  ),
  phone: <path d="M6 3h3l2 5-2 1.5a12 12 0 0 0 5.5 5.5L16 13l5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 4 5a2 2 0 0 1 2-2Z" />,
  mail: (
    <>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </>
  ),
  chat: <path d="M4 5h16v11H9l-5 4z" />,
  alert: (
    <>
      <path d="M12 3 2 21h20z" />
      <path d="M12 9v5M12 18h.01" />
    </>
  ),
  key: (
    <>
      <circle cx="8" cy="8" r="4" />
      <path d="m11 11 10 10M17 17l2-2M14 14l2-2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
  route: (
    <>
      <circle cx="5" cy="19" r="2" />
      <circle cx="19" cy="5" r="2" />
      <path d="M7 19h7a4 4 0 0 0 0-8H9a4 4 0 0 1 0-8h8" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </>
  ),
  'chevron-down': <path d="m5 9 7 7 7-7" />,
  spark: <path d="M12 2v5M12 17v5M4.2 4.2l3.5 3.5M16.3 16.3l3.5 3.5M2 12h5M17 12h5M4.2 19.8l3.5-3.5M16.3 7.7l3.5-3.5" />,
};

export function Icon({
  name,
  size = 20,
  ...props
}: { name: IconName; size?: number } & SVGProps<SVGSVGElement>) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.7}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
