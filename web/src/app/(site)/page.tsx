'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Nav } from '@/components/Nav';
import { Icon } from '@/components/Icon';
import { useUniversity } from '@/context/university';
import { useAuth } from '@/context/auth';
import { useToast } from '@/context/toast';
import { api } from '@/lib/api';
import { mediaUrl, tzs } from '@/lib/format';
import type { PropertyType, Summary } from '@/lib/types';

const emptyContact = { name: '', email: '', phone: '', subject: '', message: '' };

const stayChips: { value: 'ANY' | PropertyType; label: string }[] = [
  { value: 'ANY', label: 'All stays' },
  { value: 'HOSTEL', label: 'Hostels' },
  { value: 'APARTMENT', label: 'Apartments' },
  { value: 'ROOM', label: 'Private rooms' },
];

const budgets = [
  { value: 'any', label: 'Any budget' },
  { value: '75000', label: 'Up to TZS 75,000' },
  { value: '120000', label: 'Up to TZS 120,000' },
  { value: '200000', label: 'Up to TZS 200,000' },
  { value: '200001', label: 'TZS 200,000+' },
];

export default function LandingPage() {
  const { selected, select } = useUniversity();
  const { user } = useAuth();
  const { push } = useToast();

  const [summary, setSummary] = useState<Summary | null>(null);
  const [tab, setTab] = useState<'stay' | 'ride'>('stay');
  const [stayType, setStayType] = useState<'ANY' | PropertyType>('ANY');
  const [budget, setBudget] = useState('any');
  const [km, setKm] = useState(3.2);
  const [contact, setContact] = useState(emptyContact);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    const query = selected ? `?universityId=${selected.id}` : '';
    api<Summary>(`/api/public/summary${query}`, { signal: controller.signal, auth: false })
      .then(setSummary)
      .catch(() => undefined);
    return () => controller.abort();
  }, [selected]);

  const fare = summary?.fare;
  const fareValue = useMemo(() => {
    const base = fare?.baseFare ?? 1000;
    const perKm = fare?.perKm ?? 700;
    const minimum = fare?.minimumFare ?? 1500;
    return Math.max(minimum, Math.round((base + perKm * km) / 100) * 100);
  }, [fare, km]);
  const commission = Math.round(fareValue * (fare?.commissionRate ?? 0.12));
  const driverKeeps = fareValue - commission;

  const stats = summary?.stats;
  const stays = summary?.sampleProperties ?? [];
  const heroStay = stays[0];
  const campusName = selected?.shortName ?? 'UDOM';
  const driversNow = summary?.selected?.driversAvailable ?? 0;

  const stayQuery = useMemo(() => {
    const params = new URLSearchParams();
    if (selected) params.set('universityId', selected.id);
    if (stayType !== 'ANY') params.set('type', stayType);
    if (budget !== 'any') {
      if (budget === '200001') params.set('minPrice', '200001');
      else params.set('maxPrice', budget);
    }
    return params.toString();
  }, [selected, stayType, budget]);

  async function submitContact(event: React.FormEvent) {
    event.preventDefault();
    if (!contact.name.trim() || !contact.email.includes('@') || !contact.message.trim()) {
      push('Add your name, a valid email and a message.', 'error');
      return;
    }
    setSending(true);
    try {
      await api('/api/public/contact', {
        method: 'POST',
        body: { ...contact, subject: contact.subject.trim() || 'Campus enquiry' },
        auth: false,
      });
      setContact(emptyContact);
      push('Message sent. Karibu — our team replies within one working day.', 'success');
    } catch (error) {
      push(error instanceof Error ? error.message : 'Could not send your message', 'error');
    } finally {
      setSending(false);
    }
  }

  return (
    <>
      <Nav variant="landing" />

      {/* ------------------------------------------------ hero */}
      <section className="hero">
        <div className="hero-grid-lines" aria-hidden="true" />
        <div className="container">
          <div className="hero-inner">
            <div className="hero-copy">
              <span className="hero-badge">
                <span className="pulse-dot" />
                {selected
                  ? driversNow > 0
                    ? `Live around ${campusName} · ${driversNow} driver${driversNow === 1 ? '' : 's'} available now`
                    : `Campus-first rides & stays · ${campusName}, ${selected.city}`
                  : 'Live around UDOM · campus-first rides & stays'}
              </span>
              <h1>
                Campus life, <em>sorted.</em>
                <br />
                Rides that show up.
                <br />
                Stays that <span className="underlined">feel like home.</span>
              </h1>
              <p className="hero-sub">
                UNIRIDE moves you between lectures, markets and late-night group work with
                verified student-friendly drivers. UNISTAY puts you in inspected hostels, rooms
                and apartments next to campus — no broker games, no surprise fees.
              </p>
              <div className="hero-actions">
                <Link href={stayQuery ? `/stays?${stayQuery}` : '/stays'} className="btn btn-lime btn-lg">
                  Find your stay <Icon name="arrow-right" size={17} />
                </Link>
                <Link href="/rides" className="btn btn-glass btn-lg">
                  <Icon name="bike" size={18} /> Book a ride
                </Link>
              </div>
              <div className="hero-trust">
                <div className="avatar-stack">
                  <span className="avatar">AJ</span>
                  <span className="avatar">HS</span>
                  <span className="avatar">FR</span>
                  <span className="avatar">+</span>
                </div>
                <p>
                  <strong>Built for students, reviewed by admins</strong>
                  Student ID, NIDA and property documents verified before anything goes live.
                </p>
              </div>
            </div>

            <div className="hero-art">
              <div className="hero-photo">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl('/uploads/seed/hero-campus-ride.jpg')} alt="Student riding through campus" />
              </div>

              <div className="hero-card hero-card-ride">
                <div className="hero-card-head">
                  <span className="avatar avatar-orange">HM</span>
                  <div>
                    <strong>Hamisi is on the way</strong>
                    <span>Bajaj Boxer · MC 456 DOD</span>
                  </div>
                </div>
                <div className="ride-line">
                  <Icon name="pin" size={13} /> UDOM Main Gate
                  <span className="ride-eta">4 min</span>
                </div>
                <div className="ride-line">
                  <span className="stars">★★★★★</span> 4.80 · 42 rides
                </div>
              </div>

              <div className="hero-card hero-card-stay">
                {heroStay?.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={mediaUrl(heroStay.imageUrl)} alt={heroStay.name} />
                ) : (
                  <span className="thumb-fallback">
                    <Icon name="bed" size={20} />
                  </span>
                )}
                <div>
                  <strong>{heroStay?.name ?? 'Kisasa Comfort Hostel'}</strong>
                  <em>{tzs(heroStay?.priceFrom ?? 65000)}</em>
                  <small>per month · 10 min to UDOM</small>
                </div>
              </div>

              <div className="hero-stamp">
                {campusName}
                <br />
                {selected?.city ?? 'Dodoma'}
                <br />
                VERIFIED
              </div>
            </div>
          </div>

          <div className="hero-stats">
            <div className="hero-stat">
              <strong>{stats?.universities ?? 9}</strong>
              <span>campuses</span>
            </div>
            <div className="hero-stat">
              <strong>{stats?.verifiedDrivers ?? 2}</strong>
              <span>verified drivers</span>
            </div>
            <div className="hero-stat">
              <strong>{stats?.activeProperties ?? 6}</strong>
              <span>live stays</span>
            </div>
            <div className="hero-stat">
              <strong>{stats?.completedRides ?? 1}</strong>
              <span>rides completed</span>
            </div>
            <Link href="/stays" className="hero-stats-link">
              Browse {campusName} stays <Icon name="arrow-right" size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ story */}
      <section className="story" id="story">
        <div className="container">
          <div className="story-grid">
            <div className="story-visual">
              <div className="story-img-main">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl('/uploads/seed/hostel-exterior.jpg')} alt="Student hostel in Dodoma" />
              </div>
              <div className="story-img-small">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={mediaUrl('/uploads/seed/hostel-room.jpg')} alt="Furnished student room" />
              </div>
              <div className="story-quote">
                <p>
                  “Every stay inspected. Every ride tracked. Every shilling on record — that is
                  the whole promise.”
                </p>
                <span>The UNIRIDE UNISTAY team · Dodoma</span>
              </div>
            </div>

            <div className="story-copy">
              <div className="eyebrow">Our story</div>
              <h2>
                Built in Dodoma, for the way students <em>actually move.</em>
              </h2>
              <p>
                Moving to campus should be the start of something exciting, not a week of
                WhatsApp broker fees, “visit the caretaker” phone calls and rides you cannot
                verify. UDOM alone is vast; getting from a hostel in Nzuguni to an 8 a.m. lecture
                should not depend on luck — and finding a room should not depend on a stranger’s
                Instagram page.
              </p>
              <p>
                We started with one question: <strong>what if campus life had a single trusted
                layer?</strong> UNIRIDE connects student riders with LATRA-licensed drivers who
                commit to campus zones and upfront fares. UNISTAY verifies stay owners and tracks
                inventory down to the bed, so you know exactly what is open and what it costs.
              </p>
              <div className="story-facts">
                <div className="story-fact">
                  <strong>9</strong>
                  <span>campuses mapped at launch</span>
                </div>
                <div className="story-fact">
                  <strong>0</strong>
                  <span>broker fees, ever</span>
                </div>
                <div className="story-fact">
                  <strong>1</strong>
                  <span>account for rides and stays</span>
                </div>
              </div>
              <div className="story-sign">
                <span className="avatar">UU</span>
                <span>
                  <strong>Student-first by design</strong>
                  Every feature starts with a student problem.
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ scope */}
      <section className="section scope" id="scope">
        <div className="container">
          <div className="section-head">
            <div className="section-head-copy">
              <div className="eyebrow">Our scope</div>
              <h2 className="section-title">
                Two services, one <em>campus-first</em> standard.
              </h2>
              <p className="lede">
                Mobility on demand and housing without guesswork — each built around a university
                zone, verified people and prices you can see before you commit.
              </p>
            </div>
            <Link href="/#accounts" className="btn btn-outline">
              Choose your account <Icon name="arrow-right" size={15} />
            </Link>
          </div>

          <div className="pillars">
            <div className="pillar">
              <span className="pillar-icon">
                <Icon name="bike" size={23} />
              </span>
              <h3>UNIRIDE mobility</h3>
              <p>
                Short, fair campus rides with drivers who are verified, licensed and based in your
                university zone.
              </p>
              <ul>
                <li>
                  <Icon name="check" size={14} /> Requests matched inside your campus zone
                </li>
                <li>
                  <Icon name="check" size={14} /> Upfront fare before you confirm
                </li>
                <li>
                  <Icon name="check" size={14} /> Live states: accepted, en route, on trip
                </li>
                <li>
                  <Icon name="check" size={14} /> Cash fares recorded automatically
                </li>
              </ul>
              <Link href="/rides" className="pillar-foot">
                Book a campus ride <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            <div className="pillar pillar-feature">
              <span className="pillar-tag">Core service</span>
              <span className="pillar-icon">
                <Icon name="bed" size={23} />
              </span>
              <h3>UNISTAY verified housing</h3>
              <p>
                Hostels, rooms and apartments inspected before listing, with real photos and
                bed-level availability.
              </p>
              <ul>
                <li>
                  <Icon name="check" size={14} /> Properties reviewed by our admin team
                </li>
                <li>
                  <Icon name="check" size={14} /> See exactly which room or bed is open
                </li>
                <li>
                  <Icon name="check" size={14} /> Inquiry-first, no online deposit pressure
                </li>
                <li>
                  <Icon name="check" size={14} /> Owner contact shared only when accepted
                </li>
              </ul>
              <Link href="/stays" className="pillar-foot">
                Explore verified stays <Icon name="arrow-right" size={14} />
              </Link>
            </div>

            <div className="pillar">
              <span className="pillar-icon">
                <Icon name="shield" size={23} />
              </span>
              <h3>Campus-first trust</h3>
              <p>
                Privacy, verification and support designed around student life — not generic
                city-wide listings.
              </p>
              <ul>
                <li>
                  <Icon name="check" size={14} /> Student-ID verification for riders
                </li>
                <li>
                  <Icon name="check" size={14} /> Exact addresses hidden in public listings
                </li>
                <li>
                  <Icon name="check" size={14} /> Admin approvals for drivers and owners
                </li>
                <li>
                  <Icon name="check" size={14} /> Complaints and support in one place
                </li>
              </ul>
              <Link href="/#contact" className="pillar-foot">
                Talk to our team <Icon name="arrow-right" size={14} />
              </Link>
            </div>
          </div>

          <div className="steps">
            <div className="step">
              <span className="step-num">Step 01</span>
              <h4>Pick your campus</h4>
              <p>
                Choose your university once. Rides, stays and pricing all narrow to your campus
                zone automatically.
              </p>
            </div>
            <div className="step">
              <span className="step-num">Step 02</span>
              <h4>Hail a ride or shortlist a stay</h4>
              <p>
                Request a boda with a clear fare, or compare verified rooms and bed availability
                side by side.
              </p>
            </div>
            <div className="step">
              <span className="step-num">Step 03</span>
              <h4>Ride, inquire, move in</h4>
              <p>
                Your driver arrives, or your inquiry reaches the owner. Everything stays visible
                in your account.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ book now */}
      <section className="booknow" id="book">
        <div className="container">
          <div className="booknow-shell">
            <div className="booknow-copy">
              <div className="eyebrow">Book now</div>
              <h2>
                Start with a room — or a <em>ride.</em>
              </h2>
              <p>
                Pick your campus, tell us what you need, and see real availability before you
                create an account. Student accounts unlock inquiries and ride requests in seconds.
              </p>
              <div className="booknow-points">
                <span>
                  <Icon name="check" size={15} /> Verified listings with actual open units
                </span>
                <span>
                  <Icon name="check" size={15} /> Fare estimate before you request
                </span>
                <span>
                  <Icon name="check" size={15} /> Mobile and web stay in sync
                </span>
              </div>
            </div>

            <div className="booking-panel">
              <div className="seg-tabs" role="tablist" aria-label="Booking type">
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'stay'}
                  className={tab === 'stay' ? 'active' : ''}
                  onClick={() => setTab('stay')}
                >
                  <Icon name="bed" size={15} /> Find a stay
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={tab === 'ride'}
                  className={tab === 'ride' ? 'active' : ''}
                  onClick={() => setTab('ride')}
                >
                  <Icon name="bike" size={15} /> Estimate a ride
                </button>
              </div>

              {tab === 'stay' ? (
                <>
                  <div className="chip-row">
                    {stayChips.map((chip) => (
                      <button
                        key={chip.value}
                        type="button"
                        className={stayType === chip.value ? 'chip active' : 'chip'}
                        onClick={() => setStayType(chip.value)}
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                  <div className="field">
                    <span>Monthly budget</span>
                    <select value={budget} onChange={(event) => setBudget(event.target.value)}>
                      {budgets.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="field">
                    <span>Campus</span>
                    <select
                      value={selected?.id ?? ''}
                      onChange={(event) => {
                        const next = summary?.universities.find(
                          (university) => university.id === event.target.value,
                        );
                        if (next) select(next);
                      }}
                    >
                      {(summary?.universities ?? []).map((university) => (
                        <option key={university.id} value={university.id}>
                          {university.shortName} — {university.city}
                        </option>
                      ))}
                    </select>
                  </div>
                  <Link
                    href={stayQuery ? `/stays?${stayQuery}` : '/stays'}
                    className="btn btn-green btn-block mt-16"
                  >
                    Search verified stays <Icon name="arrow-right" size={15} />
                  </Link>

                  <div className="book-mini-list">
                    {stays.slice(0, 3).map((stay) => (
                      <Link key={stay.id} href={`/stays/${stay.id}`} className="book-mini">
                        <span className="thumb">
                          {stay.imageUrl ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={mediaUrl(stay.imageUrl)} alt="" />
                          ) : (
                            <Icon name="bed" size={16} />
                          )}
                        </span>
                        <div>
                          <strong>{stay.name}</strong>
                          <span>
                            {stay.addressArea} · {stay.availableUnits} open
                          </span>
                        </div>
                        <b>{tzs(stay.priceFrom)}</b>
                      </Link>
                    ))}
                    {stays.length === 0 && (
                      <p className="hint">Verified stays for this campus are loading…</p>
                    )}
                  </div>
                </>
              ) : (
                <>
                  <div className="range-row">
                    <span className="small muted">Trip distance</span>
                    <input
                      type="range"
                      min={0.5}
                      max={15}
                      step={0.1}
                      value={km}
                      onChange={(event) => setKm(Number(event.target.value))}
                      aria-label="Trip distance in kilometres"
                    />
                    <output>{km.toFixed(1)} km</output>
                  </div>
                  <div className="fare-box">
                    <div className="fare-box-top">
                      <span>Estimated fare</span>
                      <strong>{tzs(fareValue)}</strong>
                    </div>
                    <div className="fare-rows">
                      <div>
                        <span>Base + distance</span>
                        <b>
                          {tzs((fare?.baseFare ?? 1000) + (fare?.perKm ?? 700) * km)}
                        </b>
                      </div>
                      <div>
                        <span>Platform commission ({Math.round((fare?.commissionRate ?? 0.12) * 100)}%)</span>
                        <b>{tzs(commission)}</b>
                      </div>
                      <div>
                        <span>Driver receives</span>
                        <b>{tzs(driverKeeps)}</b>
                      </div>
                    </div>
                  </div>
                  <p className="form-note mt-16">
                    Pay cash directly to your driver. The fare is fixed before you request — no
                    meter surprises.
                  </p>
                  <Link href={`/rides?km=${km.toFixed(1)}`} className="btn btn-green btn-block mt-16">
                    Continue to ride request <Icon name="arrow-right" size={15} />
                  </Link>
                  <div className="book-mini-list">
                    <Link href="/rides" className="book-mini">
                      <span className="thumb">
                        <Icon name="pin" size={16} />
                      </span>
                      <div>
                        <strong>Where can I ride?</strong>
                        <span>Within the {campusName} driver zone</span>
                      </div>
                      <b>View map</b>
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ accounts */}
      <section className="section accounts" id="accounts">
        <div className="container">
          <div className="section-head">
            <div className="section-head-copy">
              <div className="eyebrow">Available accounts</div>
              <h2 className="section-title">
                One platform. <em>Three ways in.</em>
              </h2>
              <p className="lede">
                Students move, drivers earn, owners fill rooms. Every account is verified before
                it can transact — that is what keeps the campus ecosystem calm.
              </p>
            </div>
            {user ? (
              <Link href={user.role === 'STUDENT' ? '/dashboard' : `/${user.role.toLowerCase()}`} className="btn btn-lime">
                Open my dashboard <Icon name="arrow-right" size={15} />
              </Link>
            ) : (
              <Link href="/signup" className="btn btn-lime">
                Create an account <Icon name="arrow-right" size={15} />
              </Link>
            )}
          </div>

          <div className="account-grid">
            <article className="account-card">
              <div className="account-top">
                <span className="account-icon">
                  <Icon name="users" size={24} />
                </span>
                <span className="account-role">Students</span>
              </div>
              <h3>Get around and settle in</h3>
              <p>
                One student account for daily campus runs and a verified place to live — no
                hunting across group chats.
              </p>
              <ul className="account-list">
                <li>
                  <Icon name="check" size={14} /> Request a ride with an upfront fare
                </li>
                <li>
                  <Icon name="check" size={14} /> Inquire on inspected stays free
                </li>
                <li>
                  <Icon name="check" size={14} /> Track status and rate every trip
                </li>
              </ul>
              <Link href="/signup?role=STUDENT" className="btn btn-lime btn-sm">
                Create student account
              </Link>
              <span className="account-note">Free forever for students</span>
            </article>

            <article className="account-card">
              <div className="account-top">
                <span className="account-icon">
                  <Icon name="bike" size={24} />
                </span>
                <span className="account-role">Drivers</span>
              </div>
              <h3>Turn your boda into a campus business</h3>
              <p>
                Get requests only in your university zone, keep a transparent earnings record and
                build a rating students trust.
              </p>
              <ul className="account-list">
                <li>
                  <Icon name="check" size={14} /> LATRA licence and bike verification
                </li>
                <li>
                  <Icon name="check" size={14} /> Accept, depart, start and complete in-app
                </li>
                <li>
                  <Icon name="check" size={14} /> Daily, weekly and total earnings
                </li>
              </ul>
              <Link href="/signup?role=DRIVER" className="btn btn-primary btn-sm">
                Apply as a driver
              </Link>
              <span className="account-note">Verification takes one working day</span>
            </article>

            <article className="account-card">
              <div className="account-top">
                <span className="account-icon">
                  <Icon name="building" size={24} />
                </span>
                <span className="account-role">Stay owners</span>
              </div>
              <h3>Fill your rooms with verified students</h3>
              <p>
                List hostels, apartments or single rooms with bed-level availability, and answer
                inquiries from students who are serious about moving.
              </p>
              <ul className="account-list">
                <li>
                  <Icon name="check" size={14} /> Property inspection and verified badge
                </li>
                <li>
                  <Icon name="check" size={14} /> Room and bed inventory control
                </li>
                <li>
                  <Icon name="check" size={14} /> Accept inquiries and manage bookings
                </li>
              </ul>
              <Link href="/signup?role=OWNER" className="btn btn-soft btn-sm">
                List your property
              </Link>
              <span className="account-note">Admin review before your first listing</span>
            </article>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------ contact */}
      <section className="contact" id="contact">
        <div className="container">
          <div className="section-head">
            <div className="section-head-copy">
              <div className="eyebrow">Contact us</div>
              <h2 className="section-title">
                Talk to a <em>human.</em>
              </h2>
              <p className="lede">
                Questions about a stay, a ride or a partnership? Send a message and a real member
                of the Dodoma team will get back to you.
              </p>
            </div>
          </div>

          <div className="contact-grid">
            <div className="contact-panel">
              <h3>Karibu. How can we help?</h3>
              <p>
                We answer student questions, owner onboarding and campus partnership requests —
                usually within one working day.
              </p>
              <div className="contact-rows">
                <a href="mailto:hello@unirideunistay.co.tz" className="contact-row">
                  <Icon name="mail" size={18} />
                  <div>
                    <span>Email</span>
                    <strong>hello@unirideunistay.co.tz</strong>
                  </div>
                </a>
                <a href="tel:+255700000000" className="contact-row">
                  <Icon name="phone" size={18} />
                  <div>
                    <span>Phone / WhatsApp</span>
                    <strong>+255 700 000 000</strong>
                  </div>
                </a>
                <div className="contact-row">
                  <Icon name="pin" size={18} />
                  <div>
                    <span>Office</span>
                    <strong>Kisasa, Dodoma · Tanzania</strong>
                  </div>
                </div>
                <div className="contact-row">
                  <Icon name="clock" size={18} />
                  <div>
                    <span>Hours</span>
                    <strong>Mon–Sat · 08:00–18:00 EAT</strong>
                  </div>
                </div>
              </div>
              <div className="socials">
                <a href="https://www.instagram.com" target="_blank" rel="noreferrer">
                  Instagram
                </a>
                <a href="https://x.com" target="_blank" rel="noreferrer">
                  X / Twitter
                </a>
                <a href="https://www.facebook.com" target="_blank" rel="noreferrer">
                  Facebook
                </a>
              </div>
            </div>

            <form className="contact-form-card" onSubmit={submitContact}>
              <h3>Send us a message</h3>
              <p>Tell us what you need — include your campus if it is about a specific stay.</p>
              <div className="form-grid form-grid-2">
                <label className="field">
                  <span>Full name *</span>
                  <input
                    value={contact.name}
                    onChange={(event) => setContact({ ...contact, name: event.target.value })}
                    placeholder="Amani Joseph"
                    required
                  />
                </label>
                <label className="field">
                  <span>Email *</span>
                  <input
                    type="email"
                    value={contact.email}
                    onChange={(event) => setContact({ ...contact, email: event.target.value })}
                    placeholder="you@campus.ac.tz"
                    required
                  />
                </label>
                <label className="field">
                  <span>Phone</span>
                  <input
                    value={contact.phone}
                    onChange={(event) => setContact({ ...contact, phone: event.target.value })}
                    placeholder="+255 7xx xxx xxx"
                  />
                </label>
                <label className="field">
                  <span>Subject</span>
                  <input
                    value={contact.subject}
                    onChange={(event) => setContact({ ...contact, subject: event.target.value })}
                    placeholder="Stay enquiry, ride issue…"
                  />
                </label>
              </div>
              <label className="field mt-16">
                <span>Message *</span>
                <textarea
                  value={contact.message}
                  onChange={(event) => setContact({ ...contact, message: event.target.value })}
                  placeholder="Hi UNIRIDE UNISTAY, I am a second-year student at…"
                  required
                />
              </label>
              <div className="form-actions mt-16">
                <button type="submit" className="btn btn-primary" disabled={sending}>
                  {sending ? 'Sending…' : 'Send message'} <Icon name="arrow-right" size={15} />
                </button>
                <span className="form-note">We never share your details with third parties.</span>
              </div>
            </form>
          </div>
        </div>
      </section>
    </>
  );
}
