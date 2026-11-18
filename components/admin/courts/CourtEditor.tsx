"use client";

import Link from "next/link";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import FormField, { inputClass, textareaClass } from "@/components/ui/FormField";
import type { AdminCourt, CourtErrors } from "@/lib/admin-courts";
import { ROUTES } from "@/lib/routes";
import PhotoManager from "./PhotoManager";

type Props = {
  draft: AdminCourt;
  isNew: boolean;
  errors: CourtErrors;
  sports: string[];
  facilities: string[];
  saving: boolean;
  saved: boolean;
  saveError: string | null;
  pickError: string | null;
  onChange: (patch: Partial<AdminCourt>) => void;
  onSave: () => void;
  onReset: () => void;
  onAddFiles: (files: File[]) => void;
  onRemovePhoto: (id: string) => void;
  onMovePhoto: (index: number, dir: -1 | 1) => void;
  onSetMain: (id: string) => void;
};

/** Formulir tambah/edit lapangan. Terkendali penuh: state dipegang induk. */
export default function CourtEditor(p: Props) {
  const { draft: d, errors: e } = p;
  const hasErr = Object.keys(e).length > 0;
  const lock = p.saving;
  const field = (id: string, err?: string) => ({
    id, "aria-invalid": err ? true : undefined, "aria-describedby": `${id}-msg`, readOnly: lock,
  });

  return (
    <section aria-label="Formulir lapangan" className="box-border flex min-w-0 flex-[2_1_560px] flex-col gap-[22px] rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">{p.isNew ? "Lapangan baru" : d.nama || "Lapangan"}</h2>
        <div className="flex flex-wrap items-center gap-3">
          {!p.isNew && <Link href={ROUTES.court(d.id)} className="text-sm font-bold text-f6 underline underline-offset-4">Lihat halaman publik</Link>}
          <span className={`inline-flex h-[30px] items-center rounded-full px-3.5 text-[13px] font-bold ${d.aktif ? "bg-f1 text-f6" : "bg-[#E3EAE6] text-[#3F5247]"}`}>{d.aktif ? "Aktif" : "Nonaktif"}</span>
        </div>
      </div>

      {hasErr && <Banner tone="red" role="alert" icon="alert">Ada isian yang perlu diperbaiki. Periksa kolom bertanda merah di bawah.</Banner>}
      {p.saveError && <Banner tone="red" role="alert" icon="alert">{p.saveError}</Banner>}
      {p.saved && <Banner tone="green" role="status" icon="check">Perubahan lapangan disimpan (simulasi, belum tersimpan di server).</Banner>}

      <div className="flex flex-wrap gap-[18px]">
        <div className="min-w-[260px] flex-[2_1_260px]">
          <FormField id="nm" label="Nama lapangan" error={e.nama}>
            <input {...field("nm", e.nama)} value={d.nama} onChange={(ev) => p.onChange({ nama: ev.target.value })} className={inputClass(!!e.nama)} />
          </FormField>
        </div>
        <div className="min-w-[180px] flex-[1_1_180px]">
          <FormField id="sp" label="Jenis olahraga" error={e.sport}>
            <select
              id="sp" value={d.sport} disabled={lock} onChange={(ev) => p.onChange({ sport: ev.target.value })}
              aria-invalid={e.sport ? true : undefined} aria-describedby="sp-msg" className={`${inputClass(!!e.sport)} cursor-pointer`}
            >
              {!p.sports.includes(d.sport) && <option value="">Pilih jenis olahraga</option>}
              {p.sports.map((s) => <option key={s} value={s}>{s}</option>)}
            </select>
          </FormField>
        </div>
      </div>

      <FormField id="ds" label="Deskripsi" error={e.desc}>
        <textarea {...field("ds", e.desc)} rows={3} value={d.desc} onChange={(ev) => p.onChange({ desc: ev.target.value })} className={textareaClass(!!e.desc)} />
      </FormField>

      <FormField id="al" label="Alamat" error={e.alamat}>
        <input {...field("al", e.alamat)} value={d.alamat} onChange={(ev) => p.onChange({ alamat: ev.target.value })} className={inputClass(!!e.alamat)} />
      </FormField>

      <div>
        <div className="flex flex-wrap gap-[18px]">
          <div className="min-w-[200px] flex-[1_1_200px]">
            <FormField id="la" label="Latitude" error={e.lat}>
              <input {...field("la", e.lat)} inputMode="decimal" autoComplete="off" placeholder="-6.2088" value={d.lat} onChange={(ev) => p.onChange({ lat: ev.target.value })} className={inputClass(!!e.lat)} />
            </FormField>
          </div>
          <div className="min-w-[200px] flex-[1_1_200px]">
            <FormField id="lo" label="Longitude" error={e.lng}>
              <input {...field("lo", e.lng)} inputMode="decimal" autoComplete="off" placeholder="106.8456" value={d.lng} onChange={(ev) => p.onChange({ lng: ev.target.value })} className={inputClass(!!e.lng)} />
            </FormField>
          </div>
        </div>
        <p className="mt-2.5 text-[13px] text-muted">Koordinat dipakai untuk peta tersemat di halaman detail.</p>
      </div>

      <PhotoManager
        fotos={d.fotos} utamaId={d.utamaId} error={e.foto} pickError={p.pickError}
        onAdd={p.onAddFiles} onRemove={p.onRemovePhoto} onMove={p.onMovePhoto} onSetMain={p.onSetMain}
      />

      <div>
        <span className="mb-2.5 block text-sm font-bold" id="fac-label">Fasilitas</span>
        <div role="group" aria-labelledby="fac-label" className="flex flex-wrap gap-2.5">
          {p.facilities.map((name) => {
            const on = d.fac.includes(name);
            return (
              <button
                key={name} type="button" aria-pressed={on}
                onClick={() => p.onChange({ fac: on ? d.fac.filter((x) => x !== name) : [...d.fac, name] })}
                className={`h-[42px] cursor-pointer rounded-full border-[1.5px] px-[18px] text-sm font-bold ${on ? "border-f5 bg-f1 text-f6" : "border-line bg-white"}`}
              >
                {name}
              </button>
            );
          })}
        </div>
        <p className="mt-2.5 text-[13px] text-muted">
          {d.fac.length === 0 ? "Belum ada fasilitas dipilih. " : `${d.fac.length} fasilitas dipilih. `}Fasilitas baru ditambahkan di tab Fasilitas.
        </p>
      </div>

      <div className="flex flex-wrap gap-3 border-t border-line pt-[18px]">
        <Button onClick={p.onSave} disabled={lock}>{lock ? "Menyimpan…" : "Simpan lapangan"}</Button>
        <Button variant="outline" onClick={p.onReset} disabled={lock}>Batalkan perubahan</Button>
      </div>
    </section>
  );
}
