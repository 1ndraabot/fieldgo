export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1312px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-16">
      <span className="sr-only">Memuat pembayaran…</span>
      <div className="h-16 w-96 max-w-full rounded-3xl bg-mint" />
      <div className="mt-10 flex flex-wrap gap-10">
        <div className="flex min-w-[300px] flex-[1_1_560px] flex-col gap-6"><div className="h-[120px] rounded-[36px] bg-mist" /><div className="h-[260px] rounded-[40px] bg-mist" /></div>
        <div className="h-[420px] flex-[1_1_400px] rounded-[40px] bg-mist" />
      </div>
    </div>
  );
}
