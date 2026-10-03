import type { Metadata, Viewport } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Team Singularity — Organizational Memory AI',
  description:
    'AI-powered knowledge base that captures decisions, action items and institutional memory from your meetings, docs and emails. Built with Gemini on Google Cloud.',
  keywords: ['AI', 'knowledge management', 'meeting intelligence', 'Google Gemini', 'productivity'],
  authors: [{ name: 'Team Singularity' }],
  openGraph: {
    title: 'Team Singularity — Never lose a decision again',
    description: 'AI that remembers everything your team decides and commits to.',
    type: 'website',
  },
};

export const viewport: Viewport = {
  themeColor: '#0f172a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">
        {children}
      </body>
    </html>
  );
}
