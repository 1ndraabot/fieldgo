import Banner from "@/components/booking/Banner";
import EmptyState from "@/components/ui/EmptyState";
import Switch from "@/components/ui/Switch";
import type { AdminCourt } from "@/lib/admin-courts";
import PhotoThumb from "./PhotoThumb";

type Props = {
  courts: AdminCourt[];
  selectedId: string;
  busyIds: string[];
  onPick: (id: string) => void;
  onToggle: (id: string) => void;
};

/** Daftar lapangan: foto utama, nama, jenis, alamat, status, dan sakelar aktif/nonaktif. */
export default function CourtList({ courts, selectedId, busyIds, onPick, onToggle }: Props) {
  return (
    <section aria-label="Daftar lapangan" className="flex max-w-[400px] flex-[1_1_320px] flex-col gap-3">
      {courts.length === 0 ? (
        <EmptyState title="Belum ada lapangan">Klik “Tambah lapangan” untuk mendaftarkan lapangan pertama.</EmptyState>
      ) : (
        courts.map((c) => {
          const on = c.id === selectedId;
          return (
            <div key={c.id} className={`flex items-center gap-3 rounded-[26px] border-[1.5px] bg-white py-2.5 pl-2.5 pr-4 ${on ? "border-f5 shadow-[0_14px_30px_rgba(8,44,28,.12)]" : "border-line"}`}>
              <button type="button" onClick={() => onPick(c.id)} aria-pressed={on} className="flex min-w-0 flex-1 cursor-pointer items-center gap-3.5 rounded-[20px] border-0 bg-transparent p-1.5 text-left">
                <PhotoThumb photo={c.fotos.find((f) => f.id === c.utamaId) ?? c.fotos[0]} label={`Foto utama ${c.nama}`} className="!h-14 !w-14 flex-none !rounded-[18px]" showLabel={false} />
                <span className="min-w-0">
                  <b className="block text-base">{c.nama}</b>
                  <span className="block text-[13px] font-semibold text-muted">{c.sport} · {c.fotos.length} foto</span>
                  <span className="block truncate text-[13px] text-muted">{c.alamat}</span>
                  <span className={`mt-1.5 inline-flex h-6 items-center rounded-full px-3 text-xs font-bold ${c.aktif ? "bg-f1 text-f6" : "bg-[#E3EAE6] text-[#3F5247]"}`}>
                    {c.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </span>
              </button>
              <Switch checked={c.aktif} disabled={busyIds.includes(c.id)} onChange={() => onToggle(c.id)} label={`${c.aktif ? "Nonaktifkan" : "Aktifkan"} ${c.nama}`} />
            </div>
          );
        })
      )}
      <p className="mx-1 mt-1.5 text-[13px] leading-[1.5] text-muted">Lapangan tidak dihapus, hanya dinonaktifkan, supaya riwayat dan rekap tetap utuh.</p>
    </section>
  );
}
