'use client';

import { useEffect, useState } from 'react';
import QRCode from 'qrcode';

/**
 * Render QR string dari gateway (Xendit `QR_STRING`) menjadi gambar, tanpa pustaka
 * eksternal di server. String yang sama tetap tampil di bawahnya agar bisa disalin.
 */
export function QrBayar({ nilai, ukuran = 232 }: { nilai: string; ukuran?: number }) {
  const [src, setSrc] = useState<string | null>(null);
  const [galat, setGalat] = useState(false);

  useEffect(() => {
    let hidup = true;
    setGalat(false);
    QRCode.toDataURL(nilai, { width: ukuran * 2, margin: 1, errorCorrectionLevel: 'M' })
      .then((url) => { if (hidup) setSrc(url); })
      .catch(() => { if (hidup) setGalat(true); });
    return () => { hidup = false; };
  }, [nilai, ukuran]);

  return (
    <div
      className="flex size-[232px] items-center justify-center rounded-[24px] bg-white p-3"
      role="img"
      aria-label="Kode QR pembayaran"
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element -- data URL hasil render lokal
        <img src={src} width={ukuran} height={ukuran} alt="Kode QR pembayaran" className="size-[232px]" />
      ) : galat ? (
        <span className="px-4 text-center text-[13px] font-semibold text-[#7A1519]">
          QR gagal dirender. Salin string di bawah ke aplikasi pembayaran.
        </span>
      ) : (
        <span className="text-[13px] font-semibold text-muted">Menyiapkan QR…</span>
      )}
    </div>
  );
}
