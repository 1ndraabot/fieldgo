export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1080px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-16">
      <span className="sr-only">Memuat detail pesanan…</span>
      <div className="h-9 w-40 rounded-full bg-mist" />
      <div className="mt-6 flex items-center justify-between gap-4">
        <div className="h-12 w-72 rounded-3xl bg-mint" />
        <div className="h-8 w-44 rounded-full bg-mist" />
      </div>
      <div className="mt-8 h-[220px] rounded-[32px] bg-mist" />
      <div className="mt-6 h-[160px] rounded-[32px] bg-mist" />
      <div className="mt-6 h-[260px] rounded-[32px] bg-mist" />
    </div>
  );
}
