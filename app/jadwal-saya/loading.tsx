export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[960px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-16">
      <span className="sr-only">Memuat jadwal…</span>
      <div className="h-14 w-72 rounded-3xl bg-mint" />
      <div className="mt-12 flex flex-col gap-4">
        {[0, 1, 2].map((i) => <div key={i} className="h-[124px] rounded-[32px] bg-mist" />)}
      </div>
    </div>
  );
}
