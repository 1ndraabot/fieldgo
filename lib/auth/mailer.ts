import type { Mailer } from './service.ts';

/**
 * Dummy: mencetak email ke konsol server (tautan verifikasi muncul di terminal `npm run dev`).
 * shortcut: ganti dengan SMTP/Resend sebelum produksi. Di produksi sengaja menolak agar token tidak bocor ke log.
 */
export const mailerKonsol: Mailer = {
  async kirim({ ke, subjek, teks }) {
    if (process.env.NODE_ENV === 'production') throw new Error('Mailer produksi belum dikonfigurasi');
    console.log(`\n[EMAIL DEV] Kepada: ${ke}\nSubjek: ${subjek}\n${teks}`);
  },
};
