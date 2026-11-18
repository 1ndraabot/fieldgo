"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import Banner from "@/components/booking/Banner";
import AdminShell from "@/components/admin/AdminShell";
import Button from "@/components/ui/Button";
import {
  addName, addPhotos, countFacility, countSport, movePhoto, normalizeCourt, removePhoto, uniqueId, validateCourt,
  type AdminCourt, type CourtErrors, type CourtPhoto,
} from "@/lib/admin-courts";
import { saveCourt, setCourtActive } from "@/lib/admin-courts-client";
import { validateImageFile } from "@/lib/image-file";
import type { AdminCourtsData } from "@/lib/mock-admin-courts";
import CourtEditor from "./CourtEditor";
import CourtList from "./CourtList";
import DeactivateDialog from "./DeactivateDialog";
import NameListTab from "./NameListTab";

type Tab = "lap" | "sport" | "fac";
const TABS: [Tab, string][] = [["lap", "Daftar lapangan"], ["sport", "Jenis olahraga"], ["fac", "Fasilitas"]];
const NEW = "new";
const FIELD_ORDER: [keyof CourtErrors, string][] = [["nama", "nm"], ["sport", "sp"], ["desc", "ds"], ["alamat", "al"], ["lat", "la"], ["lng", "lo"]];

const clone = (c: AdminCourt): AdminCourt => ({ ...c, fotos: c.fotos.map((f) => ({ ...f })), fac: [...c.fac] });
const blank = (sport: string): AdminCourt => ({ id: "", nama: "", sport, aktif: true, desc: "", alamat: "", lat: "", lng: "", fotos: [], utamaId: null, fac: [] });

/**
 * Orkestrasi Admin — Kelola Lapangan. CRUD hanya simulasi di React state: tidak ada yang dikirim atau disimpan,
 * dan foto hanya dibaca di browser (object URL). Titik integrasi: lib/admin-courts-client.ts.
 */
export default function CourtsScreen({ data, failOnce }: { data: AdminCourtsData; failOnce: boolean }) {
  const [tab, setTab] = useState<Tab>("lap");
  const [courts, setCourts] = useState<AdminCourt[]>(data.courts);
  const [sports, setSports] = useState(data.sports);
  const [facilities, setFacilities] = useState(data.facilities);
  const [selId, setSelId] = useState<string>(data.courts[0]?.id ?? NEW);
  const [draft, setDraft] = useState<AdminCourt>(data.courts[0] ? clone(data.courts[0]) : blank(data.sports[0] ?? ""));
  const [errors, setErrors] = useState<CourtErrors>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [pickError, setPickError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [busyIds, setBusyIds] = useState<string[]>([]);
  const [deactivateId, setDeactivateId] = useState<string | null>(null);
  const [toggleError, setToggleError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const failed = useRef(new Set<string>());
  const urls = useRef(new Set<string>());
  const seq = useRef(0);
  const isNew = selId === NEW;

  /** Simulasi gagal sekali per aksi bila ?simulasi=gagal — untuk mencoba tampilan galat. */
  const shouldFail = (key: string) => {
    if (!failOnce || failed.current.has(key)) return false;
    failed.current.add(key);
    return true;
  };

  // lepaskan object URL foto yang sudah tidak dipakai (dibuang dari draf dan tidak ada di data tersimpan)
  useEffect(() => {
    const used = new Set<string>();
    for (const c of courts) for (const f of c.fotos) if (f.url) used.add(f.url);
    for (const f of draft.fotos) if (f.url) used.add(f.url);
    for (const u of Array.from(urls.current)) if (!used.has(u)) { URL.revokeObjectURL(u); urls.current.delete(u); }
  }, [courts, draft.fotos]);
  useEffect(() => { const set = urls.current; return () => { set.forEach((u) => URL.revokeObjectURL(u)); }; }, []);

  const touch = () => { setSaved(false); setSaveError(null); };
  const change = (patch: Partial<AdminCourt>) => {
    setDraft((d) => ({ ...d, ...patch }));
    setErrors((e) => { const n = { ...e }; for (const k of Object.keys(patch)) delete n[k as keyof CourtErrors]; return n; });
    touch();
  };

  const pick = (id: string) => {
    const c = courts.find((x) => x.id === id);
    if (!c) return;
    setSelId(id); setDraft(clone(c)); setErrors({}); setPickError(null); touch();
  };
  const addNew = () => { setTab("lap"); setSelId(NEW); setDraft(blank(sports[0] ?? "")); setErrors({}); setPickError(null); touch(); setFeedback(null); };
  const reset = () => {
    const c = courts.find((x) => x.id === selId);
    setDraft(c ? clone(c) : blank(sports[0] ?? "")); setErrors({}); setPickError(null); touch();
  };

  // ---------- foto ----------
  const addFiles = async (files: File[]) => {
    setPickError(null);
    const valid: File[] = []; const bad: string[] = [];
    for (const f of files) { const r = await validateImageFile(f); if (r.ok) valid.push(f); else bad.push(r.message); }
    if (valid.length) {
      const added: CourtPhoto[] = valid.map((f) => {
        const url = URL.createObjectURL(f);
        urls.current.add(url);
        seq.current += 1;
        return { id: `up-${seq.current}`, name: f.name, url, tone: seq.current % 6 };
      });
      setDraft((d) => ({ ...d, ...addPhotos(d.fotos, d.utamaId, added) }));
      setErrors((e) => { const n = { ...e }; delete n.foto; return n; });
      touch();
    }
    if (bad.length) setPickError(bad.join(" "));
  };
  const removeFoto = (id: string) => { setDraft((d) => ({ ...d, ...removePhoto(d.fotos, d.utamaId, id) })); touch(); };
  const moveFoto = (i: number, dir: -1 | 1) => { setDraft((d) => ({ ...d, fotos: movePhoto(d.fotos, i, dir) })); touch(); };
  const setMain = (id: string) => { setDraft((d) => ({ ...d, utamaId: id })); touch(); };

  // ---------- simpan ----------
  const save = async () => {
    const errs = validateCourt(draft, sports);
    setErrors(errs); setSaved(false); setSaveError(null); setFeedback(null);
    const first = FIELD_ORDER.find(([k]) => errs[k]);
    if (first) { document.getElementById(first[1])?.focus(); return; }
    if (errs.foto) { document.getElementById("foto-section")?.scrollIntoView({ block: "center" }); return; }

    setSaving(true);
    const next = normalizeCourt(isNew ? { ...draft, id: uniqueId(draft.nama, courts.map((c) => c.id)) } : draft);
    try {
      await saveCourt(next, { fail: shouldFail(`save:${selId}`) });
      setCourts((cs) => (isNew ? [...cs, next] : cs.map((c) => (c.id === next.id ? next : c))));
      setSelId(next.id); setDraft(clone(next)); setSaved(true);
    } catch {
      setSaveError("Perubahan belum tersimpan. Periksa koneksi lalu coba simpan lagi.");
    }
    setSaving(false);
  };

  // ---------- aktif / nonaktif ----------
  const applyActive = async (id: string, aktif: boolean) => {
    const c = courts.find((x) => x.id === id);
    if (!c) return;
    setToggleError(null); setActionError(null); setBusyIds((b) => [...b, id]);
    try {
      await setCourtActive(id, aktif, { fail: shouldFail(`toggle:${id}`) });
      setCourts((cs) => cs.map((x) => (x.id === id ? { ...x, aktif } : x)));
      if (selId === id) setDraft((d) => ({ ...d, aktif }));
      setDeactivateId(null);
      setFeedback(`${c.nama} ${aktif ? "diaktifkan" : "dinonaktifkan"} (simulasi).`);
    } catch {
      // menonaktifkan: galat tampil di dialog; mengaktifkan (tanpa dialog): galat tampil sebagai banner
      if (aktif) setActionError(`Gagal mengaktifkan ${c.nama}. Periksa koneksi lalu coba lagi.`);
      else setToggleError("Status lapangan belum berubah. Periksa koneksi lalu coba lagi.");
    }
    setBusyIds((b) => b.filter((x) => x !== id));
  };
  const requestToggle = (id: string) => {
    const c = courts.find((x) => x.id === id);
    if (!c) return;
    if (c.aktif) { setToggleError(null); setDeactivateId(id); } else void applyActive(id, true);
  };

  // ---------- jenis olahraga & fasilitas ----------
  const addSport = (name: string) => {
    const r = addName(sports, name, "sport");
    if (!r.ok) return r.message;
    setSports(r.list); setFeedback(`Jenis olahraga “${r.name}” ditambahkan (simulasi).`);
    return null;
  };
  const addFacility = (name: string) => {
    const r = addName(facilities, name, "facility");
    if (!r.ok) return r.message;
    setFacilities(r.list); setFeedback(`Fasilitas “${r.name}” ditambahkan (simulasi).`);
    return null;
  };

  const onTabKey = (e: KeyboardEvent) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const i = TABS.findIndex(([k]) => k === tab);
    const n = TABS[(i + (e.key === "ArrowRight" ? 1 : TABS.length - 1)) % TABS.length][0];
    setTab(n); setFeedback(null);
    document.getElementById(`tab-${n}`)?.focus();
  };

  const deactivating = courts.find((c) => c.id === deactivateId);

  return (
    <AdminShell active="Lapangan">
      <div className="relative mb-7 flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="text-xs font-bold uppercase tracking-[.06em] text-muted">Kelola</span>
          <h1 className="mt-1.5 font-display text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.1] tracking-[-0.04em]">Lapangan</h1>
        </div>
        <Button onClick={addNew}>Tambah lapangan</Button>
      </div>
      <p className="-mt-4 mb-6 text-[13px] leading-[1.6] text-muted">Mode demo: data contoh. Perubahan dan foto hanya disimulasikan di browser ini dan tidak disimpan.</p>

      <div role="tablist" aria-label="Bagian kelola lapangan" onKeyDown={onTabKey} className="relative flex flex-wrap gap-2.5">
        {TABS.map(([k, label]) => (
          <button
            key={k} id={`tab-${k}`} type="button" role="tab" aria-selected={tab === k} aria-controls={`panel-${k}`} tabIndex={tab === k ? 0 : -1}
            onClick={() => { setTab(k); setFeedback(null); setActionError(null); }}
            className={`h-[46px] cursor-pointer rounded-full border-[1.5px] px-[22px] text-[15px] font-bold ${tab === k ? "border-f9 bg-f9 text-white" : "border-line bg-white"}`}
          >
            {label}
          </button>
        ))}
      </div>

      {actionError && (
        <Banner tone="red" role="alert" icon="alert" className="relative mt-5">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>{actionError}</span>
            <button type="button" onClick={() => setActionError(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
          </span>
        </Banner>
      )}

      {feedback && (
        <Banner tone="green" role="status" icon="check" className="relative mt-5">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
          </span>
        </Banner>
      )}

      {tab === "lap" && (
        <div id="panel-lap" role="tabpanel" aria-labelledby="tab-lap" className="relative mt-6 flex flex-wrap items-start gap-6">
          <CourtList courts={courts} selectedId={selId} busyIds={busyIds} onPick={pick} onToggle={requestToggle} />
          <CourtEditor
            draft={draft} isNew={isNew} errors={errors} sports={sports} facilities={facilities}
            saving={saving} saved={saved} saveError={saveError} pickError={pickError}
            onChange={change} onSave={save} onReset={reset}
            onAddFiles={addFiles} onRemovePhoto={removeFoto} onMovePhoto={moveFoto} onSetMain={setMain}
          />
        </div>
      )}
      {tab === "sport" && (
        <div id="panel-sport" role="tabpanel" aria-labelledby="tab-sport">
          <NameListTab
            title="Jenis olahraga" lead="Dipakai pada filter di beranda dan pada tiap lapangan." inputId="ns" label="Jenis olahraga baru" placeholder="Contoh: Voli"
            rows={sports.map((n) => ({ name: n, count: countSport(courts, n) }))} onAdd={addSport}
          />
        </div>
      )}
      {tab === "fac" && (
        <div id="panel-fac" role="tabpanel" aria-labelledby="tab-fac">
          <NameListTab
            title="Daftar fasilitas" lead="Pilih dari daftar ini saat mengatur lapangan, atau tambah yang baru." inputId="nf" label="Fasilitas baru" placeholder="Contoh: Loker"
            rows={facilities.map((n) => ({ name: n, count: countFacility(courts, n) }))} onAdd={addFacility}
          />
        </div>
      )}

      {deactivating && (
        <DeactivateDialog
          name={deactivating.nama} busy={busyIds.includes(deactivating.id)} error={toggleError}
          onConfirm={() => applyActive(deactivating.id, false)} onClose={() => { setDeactivateId(null); setToggleError(null); }}
        />
      )}
    </AdminShell>
  );
}
