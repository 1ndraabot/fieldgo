import { PinIcon } from "@/components/ui/Icons";

type Props = { name: string; address: string; lat: number; lng: number };

/** Peta tersemat (OpenStreetMap) dari koordinat lapangan — PRD 11: embed pihak ketiga. */
export default function LocationMap({ name, address, lat, lng }: Props) {
  const dLng = 0.004;
  const dLat = 0.0025;
  const bbox = [lng - dLng, lat - dLat, lng + dLng, lat + dLat].join("%2C");
  const embed = `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`;
  const open = `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-base font-semibold">{address}</p>
        <a href={open} target="_blank" rel="noopener noreferrer" className="text-sm font-bold text-f5 underline underline-offset-4">
          Buka di peta
        </a>
      </div>
      <div
        className="relative flex h-[260px] items-center justify-center overflow-hidden rounded-[32px] bg-f1"
        style={{
          backgroundImage: "linear-gradient(#fff 2px,transparent 2px),linear-gradient(90deg,#fff 2px,transparent 2px)",
          backgroundSize: "56px 56px",
        }}
      >
        {/* tampilan cadangan bila peta belum/ tidak termuat */}
        <div aria-hidden="true" className="absolute left-[-40px] top-[-30px] h-[150px] w-[260px] rounded-full bg-mint opacity-60" />
        <div className="relative flex flex-col items-center gap-2.5" aria-hidden="true">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-[5px] border-white bg-f5 shadow-[0_12px_24px_rgba(8,44,28,.3)]">
            <PinIcon size={24} stroke="#C6F432" strokeWidth={2.4} />
          </span>
          <span className="rounded-full bg-white px-3.5 py-1.5 text-[13px] font-bold">Peta tersemat dari koordinat lapangan</span>
        </div>
        <iframe
          title={`Peta lokasi ${name}`}
          src={embed}
          loading="lazy"
          referrerPolicy="no-referrer"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    </div>
  );
}
