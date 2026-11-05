'use client';

export default function Error({ reset }: { error: Error; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto flex min-h-[60vh] max-w-[560px] flex-col items-center justify-center gap-5 px-6 text-center">
      <h1 className="font-display text-3xl font-bold">Halaman belum bisa dimuat</h1>
      <p className="text-muted">Terjadi gangguan saat mengambil data lapangan. Silakan coba lagi sebentar lagi.</p>
      <button type="button" onClick={reset} className="btn h-12 cursor-pointer rounded-full border-0 bg-brand px-7 font-bold text-white">Coba lagi</button>
    </div>
  );
}
