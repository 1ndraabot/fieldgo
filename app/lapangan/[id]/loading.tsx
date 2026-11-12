export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1312px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-16">
      <span className="sr-only">Memuat detail lapangan…</span>
      <div className="mx-auto h-10 w-64 rounded-full bg-mist" />
      <div className="mt-6 flex justify-center gap-2.5">
        {[0, 1, 2].map((i) => <div key={i} className="h-8 w-32 rounded-full bg-mist" />)}
      </div>
      <div className="mt-10 grid gap-4 md:grid-cols-3">
        <div className="aspect-[16/9] rounded-[36px] bg-mist md:col-span-2" />
        <div className="flex flex-col gap-4">
          {[0, 1].map((i) => <div key={i} className="min-h-[120px] flex-1 rounded-[28px] bg-mist" />)}
        </div>
      </div>
      <div className="mt-12 h-[520px] rounded-[32px] bg-mist" />
    </div>
  );
}
