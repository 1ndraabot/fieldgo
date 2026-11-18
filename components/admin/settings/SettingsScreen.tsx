"use client";

import { useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import FormField, { inputClass } from "@/components/ui/FormField";
import {
  MAX_CANCEL_DAYS, MAX_PAYMENT_HOURS, accountChanged, cancelText, describeChanges, groupAccount, hoursText, normalizeSettings,
  sameSettings, validateSettings, type SettingsErrors, type SettingsForm,
} from "@/lib/admin-settings";
import { saveSettings } from "@/lib/admin-settings-client";
import SettingsCard from "./SettingsCard";
import SettingsConfirmDialog from "./SettingsConfirmDialog";

const FIELD_ID: Record<keyof SettingsForm, string> = { bank: "bk", rek: "rk", an: "an", bayar: "bb", batal: "bt" };
const ORDER: (keyof SettingsForm)[] = ["bank", "rek", "an", "bayar", "batal"];

/**
 * Orkestrasi Admin — Pengaturan Global (FR-ADM-10): rekening tujuan, batas bayar, batas pembatalan.
 * Perubahan hanya simulasi di React state dan baru berlaku setelah disimpan. Titik integrasi: lib/admin-settings-client.ts.
 */
export default function SettingsScreen({ initial, failOnce }: { initial: SettingsForm; failOnce: boolean }) {
  const [saved, setSaved] = useState<SettingsForm>(initial);
  const [draft, setDraft] = useState<SettingsForm>(initial);
  const [errors, setErrors] = useState<SettingsErrors>({});
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const failed = useRef(false);

  const dirty = !sameSettings(draft, saved);
  const draftErrors = validateSettings(draft); // untuk keterangan dinamis (tanpa menampilkan galat)

  const edit = (k: keyof SettingsForm, v: string) => {
    setDraft((d) => ({ ...d, [k]: v }));
    setErrors((e) => { const n = { ...e }; delete n[k]; return n; });
    setFeedback(null); setSaveError(null);
  };
  const reset = () => { setDraft(saved); setErrors({}); setFeedback(null); setSaveError(null); };

  const requestSave = () => {
    setFeedback(null); setSaveError(null);
    const e = validateSettings(draft);
    setErrors(e);
    const first = ORDER.find((k) => e[k]);
    if (first) { document.getElementById(FIELD_ID[first])?.focus(); return; }
    if (dirty) setConfirmOpen(true);
  };

  const confirm = async () => {
    setSaving(true); setSaveError(null);
    const fail = failOnce && !failed.current;
    if (fail) failed.current = true;
    const next = normalizeSettings(draft);
    try {
      await saveSettings(next, { fail });
      setSaved(next); setDraft(next); setConfirmOpen(false);
      setFeedback("Pengaturan disimpan (simulasi, belum tersimpan di server). Perubahan berlaku untuk pesanan baru.");
    } catch {
      setSaveError("Pengaturan belum tersimpan. Periksa koneksi lalu coba simpan lagi.");
    }
    setSaving(false);
  };

  const bayarOk = !draftErrors.bayar ? Number(draft.bayar) : null;
  const batalOk = !draftErrors.batal ? Number(draft.batal) : null;
  const ro = saving;
  const noWheel = (e: { currentTarget: HTMLInputElement }) => e.currentTarget.blur(); // cegah angka berubah karena menggulir

  return (
    <AdminShell active="Pengaturan">
      <span className="text-xs font-bold uppercase tracking-[.06em] text-muted">Sistem</span>
      <h1 className="mt-1.5 font-display text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.1] tracking-[-0.04em]">Pengaturan</h1>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted">Mode demo: data contoh. Perubahan hanya disimulasikan di browser ini dan tidak disimpan.</p>

      <div className="mt-5 flex max-w-[860px] flex-col gap-[22px]">
        {feedback && (
          <Banner tone="green" role="status" icon="check">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>{feedback}</span>
              <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
            </span>
          </Banner>
        )}
        {Object.keys(errors).length > 0 && <Banner tone="red" role="alert" icon="alert">Pengaturan belum bisa disimpan. Periksa kolom bertanda merah di bawah.</Banner>}

        <SettingsCard
          title="Rekening pembayaran" subtitle="Ditampilkan ke penyewa di halaman pembayaran."
          current={<>{saved.bank} · {groupAccount(saved.rek)} · a.n. {saved.an}</>}
        >
          <FormField id="bk" label="Nama bank" error={errors.bank}>
            <input id="bk" value={draft.bank} readOnly={ro} autoComplete="off" onChange={(e) => edit("bank", e.target.value)}
              aria-invalid={errors.bank ? true : undefined} aria-describedby="bk-msg" className={inputClass(!!errors.bank)} />
          </FormField>
          <div className="flex flex-wrap gap-[18px]">
            <div className="min-w-[240px] flex-[1_1_240px]">
              <FormField id="rk" label="Nomor rekening" error={errors.rek} hint="Hanya angka, 6 sampai 20 digit.">
                <input id="rk" value={draft.rek} readOnly={ro} inputMode="numeric" autoComplete="off" onChange={(e) => edit("rek", e.target.value)}
                  aria-invalid={errors.rek ? true : undefined} aria-describedby="rk-msg" className={inputClass(!!errors.rek)} />
              </FormField>
            </div>
            <div className="min-w-[240px] flex-[1_1_240px]">
              <FormField id="an" label="Atas nama" error={errors.an}>
                <input id="an" value={draft.an} readOnly={ro} autoComplete="off" onChange={(e) => edit("an", e.target.value)}
                  aria-invalid={errors.an ? true : undefined} aria-describedby="an-msg" className={inputClass(!!errors.an)} />
              </FormField>
            </div>
          </div>
        </SettingsCard>

        <SettingsCard
          title="Batas waktu" subtitle="Aturan tenggat pembayaran dan pembatalan."
          current={<>batas bayar {hoursText(saved.bayar)} · batas pembatalan {cancelText(saved.batal)}</>}
        >
          <div className="flex flex-wrap gap-[18px]">
            <div className="min-w-[240px] flex-[1_1_240px]">
              <FormField
                id="bb" label="Batas bayar (jam)" error={errors.bayar}
                hint={bayarOk
                  ? `Dihitung sejak pesanan dibuat: bila belum dibayar ${bayarOk} jam kemudian, pesanan kedaluwarsa. Bila jadwal main dimulai lebih awal, batasnya jam mulai main.`
                  : "Dihitung sejak pesanan dibuat, atau sampai sebelum jam mulai main, mana yang lebih dahulu."}
              >
                <input id="bb" type="number" min={1} max={MAX_PAYMENT_HOURS} step={1} inputMode="numeric" value={draft.bayar} readOnly={ro}
                  onChange={(e) => edit("bayar", e.target.value)} onWheel={noWheel}
                  aria-invalid={errors.bayar ? true : undefined} aria-describedby="bb-msg" className={inputClass(!!errors.bayar)} />
              </FormField>
            </div>
            <div className="min-w-[240px] flex-[1_1_240px]">
              <FormField
                id="bt" label="Batas pembatalan (hari sebelum main)" error={errors.batal}
                hint={batalOk
                  ? `Pengajuan pembatalan pesanan terkonfirmasi hanya boleh sampai pukul 23.59, ${batalOk} hari sebelum tanggal main (${cancelText(batalOk)}). Setelah itu ditolak sistem.`
                  : "Standar: 1 hari (H-1). Pengajuan pembatalan hanya boleh sampai batas ini."}
              >
                <input id="bt" type="number" min={1} max={MAX_CANCEL_DAYS} step={1} inputMode="numeric" value={draft.batal} readOnly={ro}
                  onChange={(e) => edit("batal", e.target.value)} onWheel={noWheel}
                  aria-invalid={errors.batal ? true : undefined} aria-describedby="bt-msg" className={inputClass(!!errors.batal)} />
              </FormField>
            </div>
          </div>
        </SettingsCard>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={requestSave} disabled={!dirty || saving}>Simpan pengaturan</Button>
          <Button variant="outline" onClick={reset} disabled={!dirty || saving}>Batalkan perubahan</Button>
          {dirty && !saving && <span role="status" className="text-sm font-semibold text-[#7A4B00]">Perubahan belum disimpan</span>}
        </div>
      </div>

      {confirmOpen && (
        <SettingsConfirmDialog
          changes={describeChanges(saved, draft)} accountChanged={accountChanged(saved, draft)} busy={saving} error={saveError}
          onConfirm={confirm} onClose={() => { if (!saving) { setConfirmOpen(false); setSaveError(null); } }}
        />
      )}
    </AdminShell>
  );
}
