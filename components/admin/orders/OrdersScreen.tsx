"use client";

import { useEffect, useState } from "react";
import AdminShell from "@/components/admin/AdminShell";
import Banner from "@/components/booking/Banner";
import Button from "@/components/ui/Button";
import EmptyState from "@/components/ui/EmptyState";
import Pagination from "@/components/ui/Pagination";
import { filterOrders, isFiltering, paginate, rangeText, type AdminOrder, type StatusFilter } from "@/lib/admin-orders";
import { fetchOrders } from "@/lib/admin-orders-client";
import OrderDetailDialog from "./OrderDetailDialog";
import OrderToolbar from "./OrderToolbar";
import OrdersTable from "./OrdersTable";

type Load = { state: "loading" } | { state: "error" } | { state: "ready"; orders: AdminOrder[] };

/**
 * Orkestrasi Admin — Daftar Pesanan (FR-ADM-11). Memuat, mencari, memfilter, dan paginasi hanya di React state
 * dari data contoh. Titik integrasi: lib/admin-orders-client.ts (idealnya pencarian/filter/pagination di server).
 */
export default function OrdersScreen({ data, simulasi }: { data: AdminOrder[]; simulasi: "gagal" | "kosong" | null }) {
  const [load, setLoad] = useState<Load>({ state: "loading" });
  const [attempt, setAttempt] = useState(0);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("semua");
  const [page, setPage] = useState(1);
  const [selKode, setSelKode] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    setLoad({ state: "loading" });
    // simulasi galat: hanya percobaan pertama yang gagal ("Coba lagi" menaikkan `attempt`); aman untuk Strict Mode
    fetchOrders(simulasi === "kosong" ? [] : data, { fail: simulasi === "gagal" && attempt === 0 })
      .then((orders) => { if (live) setLoad({ state: "ready", orders }); })
      .catch(() => { if (live) setLoad({ state: "error" }); });
    return () => { live = false; };
  }, [attempt, data, simulasi]);

  const orders = load.state === "ready" ? load.orders : [];
  const filtered = filterOrders(orders, query, status);
  const pg = paginate(filtered, page);
  const filtering = isFiltering(query, status);
  const selected = selKode ? orders.find((o) => o.kode === selKode) : undefined;

  const reset = () => { setQuery(""); setStatus("semua"); setPage(1); };

  return (
    <AdminShell active="Pesanan">
      <span className="text-xs font-bold uppercase tracking-[.06em] text-muted">Pantau</span>
      <h1 className="mt-1.5 font-display text-[clamp(32px,3.6vw,46px)] font-bold leading-[1.1] tracking-[-0.04em]">Semua pesanan</h1>
      <p className="mt-2 text-[13px] leading-[1.6] text-muted">Mode demo: data contoh, tanpa server.</p>

      <div className="mt-5 flex flex-col gap-[18px]">
        <OrderToolbar
          query={query} status={status} filtering={filtering} disabled={load.state !== "ready"}
          onQuery={(q) => { setQuery(q); setPage(1); }} onStatus={(s) => { setStatus(s); setPage(1); }} onReset={reset}
        />

        {load.state === "error" && (
          <Banner tone="red" role="alert" icon="alert">
            <span className="flex flex-wrap items-center justify-between gap-3">
              <span>Daftar pesanan gagal dimuat. Periksa koneksi lalu coba lagi.</span>
              <Button variant="outline" size="sm" onClick={() => setAttempt((n) => n + 1)}>Coba lagi</Button>
            </span>
          </Banner>
        )}

        {load.state === "loading" && (
          <div aria-busy="true" aria-label="Memuat pesanan" className="flex flex-col gap-3 rounded-[32px] border-[1.5px] border-line bg-white p-5 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
            {Array.from({ length: 5 }, (_, i) => <div key={i} className="skel h-[54px]" />)}
          </div>
        )}

        {load.state === "ready" && orders.length === 0 && (
          <EmptyState title="Belum ada pesanan">Pesanan dari penyewa akan muncul di sini.</EmptyState>
        )}

        {load.state === "ready" && orders.length > 0 && filtered.length === 0 && (
          <EmptyState title="Tidak ada pesanan yang cocok">
            Ubah kata kunci atau pilih status lain.
            <span className="mt-3 block"><Button variant="outline" size="sm" onClick={reset}>Reset pencarian dan filter</Button></span>
          </EmptyState>
        )}

        {load.state === "ready" && filtered.length > 0 && (
          <div className="rounded-[32px] border-[1.5px] border-line bg-white px-2 pb-4 pt-2 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
            <OrdersTable rows={pg.items} onOpen={setSelKode} />
            <Pagination page={pg.page} pages={pg.pages} rangeText={rangeText(pg.from, pg.to, pg.total)} onPrev={() => setPage(pg.page - 1)} onNext={() => setPage(pg.page + 1)} />
          </div>
        )}

        <p role="status" className="sr-only">
          {load.state === "ready" && filtering ? `${filtered.length} pesanan ditemukan` : ""}
        </p>
      </div>

      {selected && <OrderDetailDialog order={selected} onClose={() => setSelKode(null)} />}
    </AdminShell>
  );
}
