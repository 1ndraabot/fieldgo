export default function Loading() {
  return (
    <div role="status" aria-live="polite" className="mx-auto max-w-[1440px] animate-pulse px-[clamp(16px,4.5vw,64px)] py-20">
      <span className="sr-only">Memuat…</span>
      <div className="mx-auto h-24 max-w-[700px] rounded-3xl bg-mint" />
      <div className="mx-auto mt-10 h-16 max-w-[900px] rounded-full bg-mist" />
      <div className="mx-auto mt-16 grid max-w-[1312px] grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-8">
        {[0, 1, 2].map((i) => <div key={i} className="aspect-[416/300] rounded-[36px] bg-mist" />)}
      </div>
    </div>
  );
}
