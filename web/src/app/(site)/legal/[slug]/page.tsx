import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Nav } from '@/components/Nav';
import type { Metadata } from 'next';

type Section = { heading: string; body: string[] };
type LegalDoc = { title: string; intro: string; sections: Section[] };

const docs: Record<string, LegalDoc> = {
  terms: {
    title: 'Terms of service',
    intro:
      'These terms govern the use of UNIRIDE UNISTAY by students, drivers, stay owners and administrators. By creating an account you accept them.',
    sections: [
      {
        heading: '1. Accounts and verification',
        body: [
          'You must provide accurate personal details and use a phone number you control. One person may hold one account; duplicate accounts may be removed.',
          'Students, drivers and owners act as independent users of the platform. Driver accounts and stay listings only go live after UNIRIDE UNISTAY administrators verify the submitted documents.',
        ],
      },
      {
        heading: '2. Rides and payments',
        body: [
          'UNIRIDE connects students with verified drivers inside their university zone. Fares are estimated before a request is placed using the published LATRA-aligned fare framework.',
          'Ride payments are made in cash directly to the driver at the end of a trip unless a future in-app payment method is announced. The platform records a commission on completed rides for reconciliation.',
          'Drivers must hold a valid licence, insurance and roadworthy vehicle. Students must follow the driver instructions on safety and may cancel before departure.',
        ],
      },
      {
        heading: '3. Stays, inquiries and bookings',
        body: [
          'UNISTAY helps students discover hostel, room and bed inventory near campus. Inquiries are requests for information and do not create a tenancy until an owner accepts and confirms terms.',
          'Owners are responsible for the accuracy of their listings, lawful rent, and the condition of the property. Students are responsible for inspecting a property before paying rent.',
          'Where a booking is confirmed through the platform, a success fee applies as disclosed on the property page. Rent is paid directly to the owner unless stated otherwise.',
        ],
      },
      {
        heading: '4. Acceptable use',
        body: [
          'No harassment, discrimination, fraud, impersonation or unsafe driving. Do not move conversations off-platform to evade verification, and do not share another person’s private address or contact details without consent.',
          'We may suspend accounts that breach these terms or put other users at risk. Suspensions are logged and can be reviewed by administrators.',
        ],
      },
      {
        heading: '5. Liability and changes',
        body: [
          'UNIRIDE UNISTAY is a discovery and coordination platform. Vehicle operation, tenancy and rent agreements remain between the users involved.',
          'We may update these terms as the service evolves. Material changes will be announced in-app or by SMS before they take effect.',
        ],
      },
    ],
  },
  privacy: {
    title: 'Privacy policy',
    intro:
      'This policy explains what UNIRIDE UNISTAY collects, why we collect it, and the controls you have. Privacy is a design requirement, not an afterthought.',
    sections: [
      {
        heading: '1. What we collect',
        body: [
          'Account details: name, phone number, optional email and university. Drivers additionally submit licence, national ID and vehicle insurance documents. Owners submit property details and verification images.',
          'Usage data: ride requests, status updates, inquiry messages, notification reads and support complaints. With your permission, the browser may share your current location to set a ride pickup point.',
        ],
      },
      {
        heading: '2. How we use it',
        body: [
          'To verify accounts, match rides with nearby drivers, route inquiries to the right owner, calculate fares and success fees, and send service notifications.',
          'To keep the community safe: audit administrative actions, investigate complaints, and detect fraud or abuse.',
        ],
      },
      {
        heading: '3. Privacy of locations and properties',
        body: [
          'Public property pages show the area and approximate distance from campus — never exact coordinates or unit-level addresses. Exact access details are shared with a student only after an owner accepts an inquiry.',
          'Ride pickup and destination labels are visible to the student, the assigned driver and administrators handling a complaint or audit. They are not published.',
        ],
      },
      {
        heading: '4. Sharing and retention',
        body: [
          'We share the minimum needed to deliver a service: a student’s first name and pickup details with a matched driver, and an inquirer’s message with the listing owner. We do not sell personal data.',
          'Records are retained while your account is active and for a period afterwards where required for tax, safety and dispute purposes. Verification documents are stored privately and access is restricted.',
        ],
      },
      {
        heading: '5. Your choices',
        body: [
          'You can update your name, email, university and avatar from your account settings, and you can contact support to request account closure or correction of verification data.',
          'You can withdraw a pending inquiry or cancel a ride before it starts. Notification preferences are respected across web and mobile.',
        ],
      },
    ],
  },
};

export function generateStaticParams() {
  return Object.keys(docs).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = docs[slug];
  return { title: doc ? `${doc.title} · UNIRIDE UNISTAY` : 'UNIRIDE UNISTAY' };
}

export default async function LegalPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const doc = docs[slug];
  if (!doc) notFound();

  return (
    <>
      <Nav variant="plain" />
      <section className="page-hero page-hero-plain">
        <div className="container">
          <div className="eyebrow">Legal · updated November 2026</div>
          <h1>{doc.title}</h1>
          <p>{doc.intro}</p>
        </div>
      </section>
      <div className="page-wrap">
        <div className="container legal-layout">
          <aside className="legal-nav">
            <strong>On this page</strong>
            {doc.sections.map((section) => (
              <a key={section.heading} href={`#${section.heading.replace(/\s+/g, '-').toLowerCase()}`}>
                {section.heading}
              </a>
            ))}
            <div className="legal-switch">
              {slug === 'terms' ? (
                <Link href="/legal/privacy">Read the privacy policy</Link>
              ) : (
                <Link href="/legal/terms">Read the terms of service</Link>
              )}
            </div>
          </aside>
          <article className="legal-body">
            {doc.sections.map((section) => (
              <section key={section.heading} id={section.heading.replace(/\s+/g, '-').toLowerCase()}>
                <h2>{section.heading}</h2>
                {section.body.map((paragraph) => (
                  <p key={paragraph}>{paragraph}</p>
                ))}
              </section>
            ))}
            <div className="legal-contact">
              <h2>Questions?</h2>
              <p>
                Write to <a href="mailto:hello@unirideunistay.co.tz">hello@unirideunistay.co.tz</a>{' '}
                or call <a href="tel:+255700000000">+255 700 000 000</a>. Our team replies within
                one working day.
              </p>
            </div>
          </article>
        </div>
      </div>
    </>
  );
}
