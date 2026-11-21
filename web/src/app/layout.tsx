import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import { AuthProvider } from '@/context/auth';
import { UniversityProvider } from '@/context/university';
import { ToastProvider } from '@/context/toast';

export const metadata: Metadata = {
  title: {
    default: 'UNIRIDE UNISTAY — Rides and verified stays for Tanzanian students',
    template: '%s · UNIRIDE UNISTAY',
  },
  description:
    'Book safe, student-friendly rides and find inspected hostels, rooms and apartments around your campus. Built in Dodoma for Tanzanian students.',
  keywords: [
    'UNIRIDE',
    'UNISTAY',
    'student hostel Tanzania',
    'UDOM accommodation',
    'campus rides Dodoma',
    'student housing',
  ],
  openGraph: {
    title: 'UNIRIDE UNISTAY',
    description:
      'Campus life, sorted. Verified rides and inspected student stays across Tanzania.',
    type: 'website',
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Sora:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AuthProvider>
          <UniversityProvider>
            <ToastProvider>{children}</ToastProvider>
          </UniversityProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
