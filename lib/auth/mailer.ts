import { createTransport, type Transporter } from 'nodemailer';
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

/**
 * Mailer produksi via Resend (https://resend.com). Kirim teks polos lewat REST API dengan fetch bawaan —
 * tanpa dependency tambahan. Variabel yang dibaca: RESEND_API_KEY (wajib) dan MAIL_DARI (pengirim).
 * Pemakaian: set MAIL_DARI="onboarding@resend.dev" untuk testing (hanya kirim ke email akun Resend sendiri);
 * untuk produksi verifikasi domain sendiri di dashboard Resend.
 */
export const mailerResend: Mailer = {
  async kirim({ ke, subjek, teks }) {
    const kunci = process.env.RESEND_API_KEY;
    const dari = process.env.MAIL_DARI;
    if (!kunci || !dari) throw new Error('RESEND_API_KEY/MAIL_DARI belum diset di .env');
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${kunci}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ from: dari, to: [ke], subject: subjek, text: teks }),
    });
    if (!res.ok) {
      const isi = await res.text().catch(() => '');
      throw new Error(`Resend gagal (${res.status}): ${isi.slice(0, 300)}`);
    }
  },
};

/**
 * Mailer via Gmail SMTP (nodemailer). Kirim dari akun Gmail milik sendiri ke pendaftar
 * mana pun (batas ±500 email/hari). Variabel yang dibaca:
 *   SMTP_GMAIL_USER          — alamat akun Gmail pengirim (wajib)
 *   SMTP_GMAIL_APP_PASSWORD  — App Password 16 huruf (wajib; prasyarat: 2FA akun aktif)
 *   MAIL_DARI_NAMA           — nama tampilan pengirim (opsional, default "Gelanggang")
 * Gmail memaksa From = alamat akun, jadi From dibentuk dari SMTP_GMAIL_USER + nama tampilan.
 */
export const mailerGmail: Mailer = {
  async kirim({ ke, subjek, teks }) {
    const user = process.env.SMTP_GMAIL_USER;
    const appPassword = process.env.SMTP_GMAIL_APP_PASSWORD;
    if (!user || !appPassword) throw new Error('SMTP_GMAIL_USER/SMTP_GMAIL_APP_PASSWORD belum diset di .env');
    const transport = getTransport(user, appPassword);
    await transport.sendMail({
      from: `"${process.env.MAIL_DARI_NAMA ?? 'Gelanggang'}" <${user}>`,
      to: ke,
      subject: subjek,
      text: teks,
    });
  },
};

// Transport dibuat lazily dan di-cache: hindari koneksi saat modul dimuat, dan
// reuse antar pengiriman dalam proses yang sama (serverless: 1-2 kirim per instance).
let cacheTransport: Transporter | null = null;
function getTransport(user: string, appPassword: string): Transporter {
  if (!cacheTransport) {
    cacheTransport = createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass: appPassword },
    });
  }
  return cacheTransport;
}

/**
 * Seleksi mailer (variabel MAILER: "gmail" | "resend" | "konsol"; kosong = auto):
 *   auto: Gmail jika SMTP_* diset → Resend jika RESEND_* diset → konsol (dev).
 *   Pilihan eksplisit hanya dipakai jika variabel pendukungnya ada; selain itu lanjut urutan auto.
 */
export const pilihMailer: Mailer = (() => {
  const gmail = process.env.SMTP_GMAIL_USER && process.env.SMTP_GMAIL_APP_PASSWORD ? mailerGmail : null;
  const resend = process.env.RESEND_API_KEY && process.env.MAIL_DARI ? mailerResend : null;
  const urutan = { gmail, resend, konsol: mailerKonsol } as Record<string, Mailer | null>;
  const dipilih = process.env.MAILER;
  if (dipilih && Object.prototype.hasOwnProperty.call(urutan, dipilih)) {
    return urutan[dipilih] ?? mailerKonsol; // dipilih tapi belum dikonfigurasi → konsol (dev)
  }
  return gmail ?? resend ?? mailerKonsol;
})();
