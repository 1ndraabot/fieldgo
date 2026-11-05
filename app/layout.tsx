import type { Metadata } from 'next';
import { Plus_Jakarta_Sans, Sora } from 'next/font/google';
import './globals.css';

const jakarta = Plus_Jakarta_Sans({ subsets: ['latin'], weight: ['400', '500', '600', '700'], variable: '--font-jakarta' });
const sora = Sora({ subsets: ['latin'], weight: ['600', '700', '800'], variable: '--font-sora' });

export const metadata: Metadata = {
  title: 'Gelanggang — Sewa Lapangan Online',
  description: 'Cek slot kosong, pilih jam, lalu unggah bukti transfer. Tanpa chat ke admin, tanpa bentrok jadwal.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="id" className={`${jakarta.variable} ${sora.variable}`}>
      <body>{children}</body>
    </html>
  );
}
