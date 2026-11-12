export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1080px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-16">
      <span className="sr-only">Memuat riwayat…</span>
      <div className="h-14 w-64 rounded-3xl bg-mint" />
      <div className="mt-9 flex gap-2.5">
        {[0, 1, 2, 3].map((i) => <div key={i} className="h-11 w-36 rounded-full bg-mist" />)}
      </div>
      <div className="mt-10 h-[420px] rounded-[28px] bg-mist" />
    </div>
  );
}
