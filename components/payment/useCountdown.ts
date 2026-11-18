"use client";

import { useEffect, useState } from "react";
import { remainingSeconds } from "@/lib/payment-format";

/**
 * Hitung mundur dari batas bayar. Nilai awal dihitung dari waktu server (aman untuk hydration),
 * lalu berjalan memakai jam browser. Saat `running` false, nilai terakhir dibekukan.
 */
export function useCountdown(deadlineMs: number, serverNowMs: number, running: boolean): number {
  const [remaining, setRemaining] = useState(() => remainingSeconds(deadlineMs, serverNowMs));

  useEffect(() => {
    if (!running) return;
    const startedAt = Date.now();
    const base = remainingSeconds(deadlineMs, serverNowMs) * 1000;
    const tick = () => setRemaining(Math.max(0, Math.ceil((base - (Date.now() - startedAt)) / 1000)));
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [deadlineMs, serverNowMs, running]);

  return remaining;
}
