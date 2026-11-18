"use client";

import { useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import DiscardChangesDialog from "@/components/admin/DiscardChangesDialog";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import {
  allClosed, applyMondayToAll, cloneWeek, describeChanges, isNarrowing, sameWeek, saveWeek, standardWeek, summarize, validateWeek,
  MESSAGES,
} from "@/lib/admin-hours";
import { saveOperatingHours } from "@/lib/admin-hours-client";
import type { DayHours } from "@/lib/court-detail";
import type { HoursData } from "@/lib/mock-hours";
import DayRow from "./DayRow";
import SaveConfirmDialog from "./SaveConfirmDialog";

/**
 * Orkestrasi Admin — Jam Operasional. Perubahan hanya simulasi di React state: tidak ada yang dikirim atau disimpan,
 * dan hanya diterapkan setelah "Simpan jam operasional" (FR-ADM-04). Titik integrasi: lib/admin-hours-client.ts.
 */
export default function HoursScreen({ data, failOnce }: { data: HoursData; failOnce: boolean }) {
  const { courts, activeOrders } = data;
  const [saved, setSaved] = useState<Record<string, DayHours[]>>(() => Object.fromEntries(courts.map((c) => [c.id, cloneWeek(c.hours)])));
  const [selId, setSelId] = useState(courts[0]?.id ?? "");
  const [draft, setDraft] = useState<DayHours[]>(() => cloneWeek(courts[0]?.hours ?? standardWeek()));
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const failed = useRef(new Set<string>());

  const court = courts.find((c) => c.id === selId);
  if (!court) {
    return (
      <AdminShell active="Jam operasional">
        <h1 className="font-display text-[clamp(32px,3.6vw,46px)] font-bold tracking-[-0.04em]">Jam operasional</h1>
        <div className="mt-7"><EmptyState title="Belum ada lapangan">Tambahkan lapangan di menu Lapangan, lalu atur jam operasionalnya di sini.</EmptyState></div>
      </AdminShell>
    );
  }

  const current = saved[court.id];
  const errors = validateWeek(draft);
  const hasErr = errors.some(Boolean);
  const dirty = !sameWeek(draft, current);
  const changes = describeChanges(current, draft);
  const clearMsgs = () => { setFeedback(null); setError(null); };
  const edit = (fn: (d: DayHours[]) => DayHours[]) => { setDraft(fn); clearMsgs(); };
  const setDay = (i: number, patch: Partial<DayHours>) => edit((d) => d.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const goCourt = (id: string) => { setSelId(id); setDraft(cloneWeek(saved[id])); clearMsgs(); setSwitchTo(null); setConfirmOpen(false); };
  const requestCourt = (id: string) => { if (id === selId) return; if (dirty) setSwitchTo(id); else goCourt(id); };

  const doSave = async () => {
    if (hasErr || saving) return;
    setSaving(true); setError(null);
    const key = `save:${court.id}`;
    const fail = failOnce && !failed.current.has(key);
    if (fail) failed.current.add(key);
    try {
      await saveOperatingHours(court.id, draft, { fail });
      setSaved((s) => saveWeek(s, court.id, draft));
      setFeedback(`Jam operasional ${court.name} disimpan (simulasi, belum tersimpan di server). Berlaku: ${summarize(draft)}.`);
      setConfirmOpen(false);
    } catch {
      setError("Jam operasional belum tersimpan. Periksa koneksi lalu coba simpan lagi.");
    }
    setSaving(false);
  };
  const requestSave = () => { if (hasErr) return; if (isNarrowing(current, draft)) { setError(null); setConfirmOpen(true); } else void doSave(); };

  return (
    <AdminShell active="Jam operasional">
      <span className="text-xs font-bold uppercase tracking-[.06em] text-muted">Kelola</span>
      <h1 className="mt-1.5 font-display text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.1] tracking-[-0.04em]">Jam operasional</h1>

      <div className="mt-5 flex max-w-[980px] flex-col gap-[22px]">
        <p className="m-0 text-base leading-[1.65] text-muted">
          Atur hari buka dan jam buka tiap lapangan. Slot hanya muncul di dalam jam operasional. Standar: 06.00 sampai 24.00 setiap hari.
        </p>
        <p className="-mt-3.5 text-[13px] leading-[1.6] text-muted">Mode demo: data contoh. Perubahan hanya disimulasikan di browser ini dan tidak disimpan.</p>

        <div role="group" aria-label="Pilih lapangan" className="flex flex-wrap gap-2.5">
          {courts.map((c) => (
            <button
              key={c.id} type="button" aria-pressed={c.id === selId} onClick={() => requestCourt(c.id)}
              className={`h-[46px] cursor-pointer rounded-full border-[1.5px] px-5 text-[15px] font-bold ${c.id === selId ? "border-f9 bg-f9 text-white" : "border-line bg-white"}`}
            >
              {c.name}
            </button>
          ))}
        </div>

        {feedback && (
          <Banner tone="green" role="status" icon="check">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>{feedback}</span>
              <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
            </span>
          </Banner>
        )}
        {error && !confirmOpen && <Banner tone="red" role="alert" icon="alert">{error}</Banner>}

        <section aria-label="Jam per hari" aria-busy={saving} className="flex flex-col gap-3.5 rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">{court.name}</h2>
                <span className="inline-flex h-[26px] items-center rounded-full bg-f1 px-3 text-xs font-bold text-f6">{court.sport}</span>
              </div>
              <p className="mt-1 text-[13px] font-medium text-muted">Berlaku saat ini: <b className="text-f9">{summarize(current)}</b></p>
            </div>
            <div className="flex flex-wrap gap-2.5">
              <Button variant="outline" size="sm" disabled={saving} onClick={() => edit(applyMondayToAll)}>Terapkan jam Senin ke semua hari</Button>
              <Button variant="outline" size="sm" disabled={saving} onClick={() => edit(() => standardWeek())}>Kembalikan standar</Button>
            </div>
          </div>

          {draft.map((d, i) => (
            <DayRow
              key={i} index={i} value={d} error={errors[i]} disabled={saving}
              onToggle={() => setDay(i, { open: !d.open })}
              onOpen={(h) => setDay(i, { buka: h })} onClose={(h) => setDay(i, { tutup: h })}
            />
          ))}
        </section>

        {allClosed(draft) && <Banner tone="amber" role="note" icon="alert" className="!rounded-[22px] !px-5 !py-4 !text-sm">{MESSAGES.allClosed}</Banner>}

        <Banner tone="amber" role="note" icon="alert" className="!rounded-[22px] !px-5 !py-4 !text-sm">
          Jam yang dipersempit tidak membatalkan pesanan yang sudah ada. Periksa pesanan aktif di halaman Pesanan bila perlu.
        </Banner>

        <div className="flex flex-wrap items-center gap-3">
          <Button onClick={requestSave} disabled={hasErr || saving}>{saving && !confirmOpen ? "Menyimpan…" : "Simpan jam operasional"}</Button>
          <Button variant="outline" onClick={() => { setDraft(cloneWeek(current)); clearMsgs(); }} disabled={saving || !dirty}>Batalkan perubahan</Button>
          {hasErr && <span role="alert" className="text-[13px] font-bold text-[#B42328]">{MESSAGES.order}</span>}
          {dirty && !hasErr && !saving && <span role="status" className="text-sm font-semibold text-[#7A4B00]">Perubahan belum disimpan</span>}
        </div>
      </div>

      {confirmOpen && (
        <SaveConfirmDialog
          courtName={court.name} changes={changes} activeOrders={activeOrders[court.id] ?? 0}
          busy={saving} error={error} onConfirm={doSave} onClose={() => { if (!saving) { setConfirmOpen(false); setError(null); } }}
        />
      )}
      {switchTo && <DiscardChangesDialog subject={`Jam operasional ${court.name}`} onStay={() => setSwitchTo(null)} onDiscard={() => goCourt(switchTo)} />}
    </AdminShell>
  );
}
