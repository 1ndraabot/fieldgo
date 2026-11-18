const STEPS = ["Pilih slot", "Bayar", "Verifikasi admin"];

export default function StepIndicator({ current = 0 }: { current?: number }) {
  return (
    <ol aria-label="Tahapan pemesanan" className="mb-6 flex list-none flex-wrap gap-2.5 p-0 text-sm font-bold">
      {STEPS.map((label, i) => {
        const on = i === current;
        const done = i < current; // langkah yang sudah dilewati
        return (
          <li
            key={label}
            aria-current={on ? "step" : undefined}
            className={`flex items-center gap-2 rounded-full py-2 pl-2.5 pr-4 ${
              on ? "bg-f9 text-white" : done ? "bg-f1 text-f6" : "border border-line bg-f0 text-muted"
            }`}
          >
            <span className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-xs ${
              on ? "bg-lime text-f9" : done ? "bg-f5" : "border border-line bg-white"
            }`}>
              {done ? (
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="3.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M20 6 9 17l-5-5" /></svg>
              ) : (
                i + 1
              )}
            </span>
            {label}
          </li>
        );
      })}
    </ol>
  );
}
