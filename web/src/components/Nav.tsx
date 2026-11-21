'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Logo } from './Logo';
import { UniversitySelect } from './UniversitySelect';
import { useAuth } from '@/context/auth';
import { initials, roleHome } from '@/lib/format';

const links = [
  { href: '/', label: 'Home' },
  { href: '/stays', label: 'Book now' },
  { href: '/#story', label: 'About us' },
  { href: '/#accounts', label: 'Accounts' },
  { href: '/#contact', label: 'Contact us' },
];

export function Nav({ variant = 'landing' }: { variant?: 'landing' | 'plain' }) {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const pathname = usePathname();
  const { user } = useAuth();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  const home = user ? roleHome(user.role) : '/';

  return (
    <header className={`nav ${scrolled || variant === 'plain' ? 'nav-scrolled' : ''}`}>
      <div className="nav-inner">
        <Logo href={home} light={variant === 'landing' && !scrolled} />
        <nav className="nav-links" aria-label="Main navigation">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={pathname === link.href ? 'nav-link active' : 'nav-link'}
            >
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="nav-actions">
          <div className="nav-uni">
            <UniversitySelect compact />
          </div>
          {user ? (
            <Link href={home} className="btn btn-dark btn-sm nav-account">
              <span className="avatar avatar-sm">{initials(user.fullName)}</span>
              <span>{user.fullName.split(' ')[0]}</span>
            </Link>
          ) : (
            <>
              <Link href="/login" className="btn btn-ghost btn-sm">
                Login
              </Link>
              <Link href="/signup" className="btn btn-primary btn-sm">
                Sign up
              </Link>
            </>
          )}
          <button
            type="button"
            className="nav-burger"
            aria-label="Toggle menu"
            aria-expanded={open}
            onClick={() => setOpen((current) => !current)}
          >
            <span />
            <span />
            <span />
          </button>
        </div>
      </div>
      {open && (
        <div className="nav-mobile">
          {links.map((link) => (
            <Link key={link.href} href={link.href} className="nav-mobile-link">
              {link.label}
            </Link>
          ))}
          <div className="nav-mobile-actions">
            {user ? (
              <Link href={home} className="btn btn-primary">
                Go to dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="btn btn-outline">
                  Login
                </Link>
                <Link href="/signup" className="btn btn-primary">
                  Create account
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
