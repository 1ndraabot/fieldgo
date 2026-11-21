import Heading from "@/components/detail-pesanan/ui/Heading";

const STEPS = [
  {
    no: "01",
    title: "Satu slot, satu pesanan.",
    body: "Slot yang dipegang pesanan lain tidak bisa dipilih. Tidak ada pemesanan ganda.",
    card: "border-[1.5px] border-line bg-white",
    numCls: "text-f4",
    bodyCls: "text-muted",
  },
  {
    no: "02",
    title: "Bayar dengan transfer.",
    body: "Batas bayar 24 jam atau sebelum jam main. Hitungan berhenti saat bukti diunggah.",
    card: "bg-f5 text-white",
    numCls: "text-lime",
    bodyCls: "text-white/90",
  },
  {
    no: "03",
    title: "Batal sebelum bayar.",
    body: "Pesanan yang belum dibayar bisa dibatalkan langsung, tanpa form.",
    card: "bg-f9 text-white",
    numCls: "text-lime",
    bodyCls: "text-white/80",
  },
];

export default function HowItWorks() {
  return (
    <section id="cara" className="bg-white px-[clamp(16px,4.5vw,64px)] py-[120px]">
      <div className="mx-auto max-w-[1312px]">
        <Heading
          accent="langsung main."
          className="mb-12 text-center text-[clamp(34px,4vw,52px)] leading-[1.15]"
        >
          Tiga langkah,
        </Heading>
        <ol className="grid grid-cols-[repeat(auto-fit,minmax(300px,1fr))] gap-6">
          {STEPS.map((s) => (
            <li
              key={s.no}
              className={`box-border flex min-h-[280px] flex-col justify-between gap-7 rounded-[36px] p-9 ${s.card}`}
            >
              <span className={`font-display text-[56px] font-extrabold tracking-[-0.04em] ${s.numCls}`}>
                {s.no}
              </span>
              <div>
                <h3 className="mb-2.5 font-display text-2xl font-bold tracking-[-0.02em]">{s.title}</h3>
                <p className={`text-base leading-[1.6] ${s.bodyCls}`}>{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
