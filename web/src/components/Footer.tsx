'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Logo } from './Logo';
import { Icon } from './Icon';
import { useToast } from '@/context/toast';

export function Footer() {
  const [email, setEmail] = useState('');
  const { push } = useToast();

  return (
    <footer className="footer">
      <div className="footer-glow" aria-hidden="true" />
      <div className="footer-top">
        <div className="footer-brand">
          <Logo light />
          <p>
            Peer-to-peer mobility and verified student housing, built around Tanzanian campuses.
            Rides and stays in one calm, trustworthy place.
          </p>
          <div className="footer-contact">
            <a href="mailto:hello@unirideunistay.co.tz">
              <Icon name="mail" size={16} /> hello@unirideunistay.co.tz
            </a>
            <a href="tel:+255700000000">
              <Icon name="phone" size={16} /> +255 700 000 000
            </a>
            <span>
              <Icon name="pin" size={16} /> Dodoma · Tanzania
            </span>
          </div>
        </div>

        <div className="footer-columns">
          <div>
            <h4>Product</h4>
            <Link href="/stays">Find a stay</Link>
            <Link href="/rides">Book a ride</Link>
            <Link href="/#scope">Our scope</Link>
            <Link href="/#how">How it works</Link>
          </div>
          <div>
            <h4>Accounts</h4>
            <Link href="/signup?role=STUDENT">Students</Link>
            <Link href="/signup?role=DRIVER">Drivers</Link>
            <Link href="/signup?role=OWNER">Stay owners</Link>
            <Link href="/login">Sign in</Link>
          </div>
          <div>
            <h4>Company</h4>
            <Link href="/#story">Our story</Link>
            <Link href="/#accounts">Available accounts</Link>
            <Link href="/#contact">Contact us</Link>
            <Link href="/legal/terms">Terms of service</Link>
            <Link href="/legal/privacy">Privacy policy</Link>
          </div>
        </div>

        <div className="footer-news">
          <h4>Get campus updates</h4>
          <p>New verified stays, driver openings and campus news. No noise.</p>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              if (!email.includes('@')) {
                push('Enter a valid email address', 'error');
                return;
              }
              setEmail('');
              push('You are on the list. Karibu!', 'success');
            }}
          >
            <input
              type="email"
              placeholder="you@campus.ac.tz"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              aria-label="Email address"
            />
            <button type="submit" className="btn btn-lime btn-sm">
              Subscribe
            </button>
          </form>
          <div className="footer-socials">
            <a href="https://www.instagram.com" target="_blank" rel="noreferrer" aria-label="Instagram">
              Instagram
            </a>
            <a href="https://x.com" target="_blank" rel="noreferrer" aria-label="X">
              X / Twitter
            </a>
            <a href="https://www.facebook.com" target="_blank" rel="noreferrer" aria-label="Facebook">
              Facebook
            </a>
          </div>
        </div>
      </div>

      <div className="footer-bottom">
        <span>© {new Date().getFullYear()} UNIRIDE UNISTAY. Built in Tanzania for Tanzanian students.</span>
        <span className="footer-note">
          Riding with UNIRIDE requires a LATRA-licensed operator. Stay listings are verified before going live.
        </span>
      </div>
    </footer>
  );
}
