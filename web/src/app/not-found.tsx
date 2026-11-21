import Link from 'next/link';
import { Nav } from '@/components/Nav';
import { Footer } from '@/components/Footer';
import { Icon } from '@/components/Icon';

export default function NotFound() {
  return (
    <>
      <Nav variant="plain" />
      <section className="page-hero page-hero-plain">
        <div className="container">
          <div className="eyebrow">404 · Off campus</div>
          <h1>This page took a different boda.</h1>
          <p>
            The link may be old, or the listing is no longer published. Head back to the
            university hub and pick up where you left off.
          </p>
          <div className="page-hero-actions">
            <Link href="/" className="btn btn-lime">
              <Icon name="arrow-left" size={16} /> Back home
            </Link>
            <Link href="/stays" className="btn btn-glass">
              <Icon name="bed" size={16} /> Browse verified stays
            </Link>
          </div>
        </div>
      </section>
      <div className="page-wrap">
        <div className="container">
          <div className="grid-3">
            <Link href="/rides" className="card link-card">
              <Icon name="bike" size={22} />
              <h3>Book a ride</h3>
              <p>Fixed fares with verified campus drivers.</p>
            </Link>
            <Link href="/stays" className="card link-card">
              <Icon name="bed" size={22} />
              <h3>Find a stay</h3>
              <p>Room and bed inventory near your campus.</p>
            </Link>
            <Link href="/#contact" className="card link-card">
              <Icon name="chat" size={22} />
              <h3>Talk to us</h3>
              <p>Ask a question about rides, stays or verification.</p>
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </>
  );
}
