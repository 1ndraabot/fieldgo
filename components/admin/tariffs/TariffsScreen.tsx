"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import DialogShell from "@/components/ui/DialogShell";
import EmptyState from "@/components/ui/EmptyState";
import {
  DAY_TYPES, analyzeCourt, courtTariffsFrom, newRow, sameTariffs, toTariffs, type CourtTariffs, type DayType, type TariffRow,
} from "@/lib/admin-tariffs";
import { saveTariffs } from "@/lib/admin-tariffs-client";
import { DAY_NAMES, hourLabel } from "@/lib/datetime";
import type { DayHours } from "@/lib/court-detail";
import type { TariffsData } from "@/lib/mock-tariffs";
import DeleteTariffDialog from "./DeleteTariffDialog";
import TariffSection from "./TariffSection";

type Filter = "all" | DayType;
const FILTERS: [Filter, string][] = [["all", "Semua"], ["weekday", "Hari kerja"], ["weekend", "Akhir pekan"]];

const clone = (c: CourtTariffs): CourtTariffs => ({ weekday: c.weekday.map((r) => ({ ...r })), weekend: c.weekend.map((r) => ({ ...r })) });

function hoursSummary(h: DayHours[]): string {
  const same = h.every((d) => d.open === h[0].open && d.buka === h[0].buka && d.tutup === h[0].tutup);
  if (same) return h[0].open ? `Buka setiap hari ${hourLabel(h[0].buka)}–${hourLabel(h[0].tutup)}` : "Tutup setiap hari";
  return h.map((d, i) => `${DAY_NAMES[i].slice(0, 3)} ${d.open ? `${hourLabel(d.buka)}–${hourLabel(d.tutup)}` : "tutup"}`).join(" · ");
}

/**
 * Orkestrasi Admin — Kelola Tarif. CRUD hanya simulasi di React state: tidak ada yang dikirim atau disimpan.
 * Titik integrasi: lib/admin-tariffs-client.ts. Pesanan yang sudah dibuat memakai harga terkunci dan tidak disentuh.
 */
export default function TariffsScreen({ data, failOnce }: { data: TariffsData; failOnce: boolean }) {
  const { courts, lockedOrders } = data;
  const [saved, setSaved] = useState<Record<string, CourtTariffs>>(() => Object.fromEntries(courts.map((c) => [c.id, courtTariffsFrom(c.tariffs)])));
  const [selId, setSelId] = useState(courts[0]?.id ?? "");
  const [draft, setDraft] = useState<CourtTariffs>(() => clone(saved[courts[0]?.id] ?? { weekday: [], weekend: [] }));
  const [filter, setFilter] = useState<Filter>("all");
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [del, setDel] = useState<{ tipe: DayType; key: string } | null>(null);
  const [switchTo, setSwitchTo] = useState<string | null>(null);
  const [focusId, setFocusId] = useState<string | null>(null);
  const failed = useRef(new Set<string>());

  const court = courts.find((c) => c.id === selId);
  const analysis = useMemo(() => (court ? analyzeCourt(draft, court.hours) : null), [court, draft]);
  const dirty = court ? !sameTariffs(draft, saved[court.id]) : false;

  useEffect(() => { if (focusId) { document.getElementById(focusId)?.focus(); setFocusId(null); } }, [focusId]);

  if (!court || !analysis) {
    return (
      <AdminShell active="Tarif">
        <h1 className="font-display text-[clamp(32px,3.6vw,46px)] font-bold tracking-[-0.04em]">Tarif</h1>
        <div className="mt-7"><EmptyState title="Belum ada lapangan">Tambahkan lapangan di menu Lapangan, lalu atur tarifnya di sini.</EmptyState></div>
      </AdminShell>
    );
  }

  const ordersLocked = lockedOrders.filter((o) => o.courtId === court.id).length;
  const clearMsgs = () => { setFeedback(null); setError(null); };

  const patchRows = (tipe: DayType, fn: (rows: TariffRow[]) => TariffRow[]) => { setDraft((d) => ({ ...d, [tipe]: fn(d[tipe]) })); clearMsgs(); };
  const changeRow = (tipe: DayType, key: string, patch: Partial<TariffRow>) => patchRows(tipe, (rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  const addRow = (tipe: DayType) => {
    const row = newRow(draft[tipe]);
    patchRows(tipe, (rs) => [...rs, row]);
    setFocusId(`${tipe}-${row.key}-s`);
  };
  const confirmDelete = () => { if (del) patchRows(del.tipe, (rs) => rs.filter((r) => r.key !== del.key)); setDel(null); };

  const goCourt = (id: string) => {
    setSelId(id); setDraft(clone(saved[id])); clearMsgs(); setSwitchTo(null);
  };
  const requestCourt = (id: string) => { if (id === selId) return; if (dirty) setSwitchTo(id); else goCourt(id); };
  const reset = () => { setDraft(clone(saved[court.id])); clearMsgs(); };

  const save = async () => {
    clearMsgs();
    if (analysis.hasError) {
      setError("Tarif belum bisa disimpan. Perbaiki rentang bertanda merah (jam tidak valid, harga 0, atau tumpang tindih) lebih dulu.");
      for (const tipe of ["weekday", "weekend"] as const) {
        const i = analysis[tipe].errors.findIndex(Boolean);
        if (i >= 0) { document.getElementById(`${tipe}-${draft[tipe][i].key}-s`)?.focus(); break; }
      }
      return;
    }
    setSaving(true);
    const key = `save:${court.id}`;
    const fail = failOnce && !failed.current.has(key);
    if (fail) failed.current.add(key);
    try {
      await saveTariffs(court.id, toTariffs(draft), { fail });
      setSaved((s) => ({ ...s, [court.id]: clone(draft) }));
      setFeedback(
        `Tarif ${court.name} disimpan (simulasi, belum tersimpan di server). Berlaku untuk pesanan baru; ${ordersLocked} pesanan yang sudah dibuat tetap memakai harga terkunci.`,
      );
    } catch {
      setError("Tarif belum tersimpan. Periksa koneksi lalu coba simpan lagi.");
    }
    setSaving(false);
  };

  const gapCourts = new Set(courts.filter((c) => analyzeCourt(saved[c.id], c.hours).hasGap).map((c) => c.id));
  const delTarget = del ? draft[del.tipe].find((r) => r.key === del.key) : undefined;
  const delTitle = del ? DAY_TYPES.find((d) => d.type === del.tipe)!.title : "";

  return (
    <AdminShell active="Tarif">
      <span className="text-xs font-bold uppercase tracking-[.06em] text-muted">Kelola</span>
      <h1 className="mt-1.5 font-display text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.1] tracking-[-0.04em]">Tarif</h1>
      <p className="mt-2 max-w-[760px] text-[15px] leading-[1.65] text-muted">
        Harga per jam ditentukan per lapangan dan tipe hari. Seluruh jam operasional harus tertutup tarif; jam tanpa tarif tidak bisa dipesan.
      </p>
      <p className="mt-1.5 text-[13px] leading-[1.6] text-muted">Mode demo: data contoh. Perubahan hanya disimulasikan di browser ini dan tidak disimpan.</p>

      <div role="group" aria-label="Pilih lapangan" className="mt-6 flex flex-wrap gap-2.5">
        {courts.map((c) => {
          const on = c.id === selId;
          return (
            <button
              key={c.id} type="button" aria-pressed={on} onClick={() => requestCourt(c.id)}
              aria-label={gapCourts.has(c.id) ? `${c.name}, ada jam tanpa tarif` : c.name}
              className={`inline-flex h-[46px] cursor-pointer items-center gap-2 rounded-full border-[1.5px] px-5 text-[15px] font-bold ${on ? "border-f9 bg-f9 text-white" : "border-line bg-white"}`}
            >
              {c.name}
              {gapCourts.has(c.id) && <span aria-hidden="true" className="h-2 w-2 rounded-full bg-star" />}
            </button>
          );
        })}
      </div>

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border-[1.5px] border-line bg-white px-6 py-4">
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="font-display text-xl font-bold tracking-[-0.02em]">{court.name}</h2>
            <span className="inline-flex h-[26px] items-center rounded-full bg-f1 px-3 text-xs font-bold text-f6">{court.sport}</span>
          </div>
          <p className="mt-1 text-[13px] font-medium text-muted">{hoursSummary(court.hours)}</p>
        </div>
        <div role="group" aria-label="Filter tipe hari" className="flex flex-wrap gap-2">
          {FILTERS.map(([k, label]) => (
            <button
              key={k} type="button" aria-pressed={filter === k} onClick={() => setFilter(k)}
              className={`h-10 cursor-pointer rounded-full border-[1.5px] px-[18px] text-sm font-bold ${filter === k ? "border-f5 bg-f1 text-f6" : "border-line bg-white"}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <Banner tone="teal" role="note" icon="info" className="mt-5 !rounded-[22px] !px-5 !py-3.5 !text-sm">
        Perubahan tarif hanya berlaku untuk pesanan baru. Pesanan yang sudah dibuat tetap memakai harga yang dikunci saat dipesan.
      </Banner>

      {feedback && (
        <Banner tone="green" role="status" icon="check" className="mt-4">
          <span className="flex flex-wrap items-center justify-between gap-3">
            <span>{feedback}</span>
            <button type="button" onClick={() => setFeedback(null)} className="cursor-pointer rounded-full border-[1.5px] border-current bg-transparent px-3.5 py-1 text-[13px] font-bold">Tutup</button>
          </span>
        </Banner>
      )}
      {error && <Banner tone="red" role="alert" icon="alert" className="mt-4">{error}</Banner>}

      <div className="mt-6 flex flex-col gap-6" aria-busy={saving}>
        {DAY_TYPES.filter((d) => filter === "all" || filter === d.type).map((d) => (
          <TariffSection
            key={d.type} tipe={d.type} title={d.title} sub={d.sub} rows={draft[d.type]} analysis={analysis[d.type]} readOnly={saving}
            onChangeRow={(key, patch) => changeRow(d.type, key, patch)} onAddRow={() => addRow(d.type)} onDeleteRow={(key) => setDel({ tipe: d.type, key })}
          />
        ))}
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-3">
        <Button onClick={save} disabled={saving}>{saving ? "Menyimpan…" : "Simpan tarif"}</Button>
        <Button variant="outline" onClick={reset} disabled={saving || !dirty}>Batalkan perubahan</Button>
        {dirty && !saving && <span role="status" className="text-sm font-semibold text-[#7A4B00]">Perubahan belum disimpan</span>}
      </div>

      {del && delTarget && <DeleteTariffDialog tipe={del.tipe} title={delTitle} row={delTarget} onConfirm={confirmDelete} onClose={() => setDel(null)} />}

      {switchTo && (
        <DialogShell titleId="sw-t" title="Buang perubahan?" onClose={() => setSwitchTo(null)}>
          <p className="text-[15px] leading-[1.6] text-muted">Tarif <b className="text-f9">{court.name}</b> punya perubahan yang belum disimpan. Pindah lapangan akan membuangnya.</p>
          <div className="flex flex-wrap justify-end gap-3">
            <Button variant="outline" size="sm" onClick={() => setSwitchTo(null)}>Tetap di sini</Button>
            <Button variant="danger" size="sm" onClick={() => goCourt(switchTo)}>Buang dan pindah</Button>
          </div>
        </DialogShell>
      )}
    </AdminShell>
  );
}
