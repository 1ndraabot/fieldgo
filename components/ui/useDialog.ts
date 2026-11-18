"use client";

import { useEffect, useRef } from "react";

/** Perilaku dialog modal: fokus masuk ke dialog, Escape menutup, Tab terkurung, fokus kembali saat ditutup. */
export function useDialog<T extends HTMLElement>(onClose: () => void, locked = false) {
  const ref = useRef<T>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    const el = ref.current;
    const prev = document.activeElement as HTMLElement | null;
    el?.querySelector<HTMLElement>("button:not([disabled]), a[href]")?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !locked) return closeRef.current();
      if (e.key !== "Tab" || !el) return;
      const f = Array.from(el.querySelectorAll<HTMLElement>("button:not([disabled]), a[href]"));
      if (!f.length) return;
      const a = f[0], b = f[f.length - 1];
      if (e.shiftKey && document.activeElement === a) { e.preventDefault(); b.focus(); }
      else if (!e.shiftKey && document.activeElement === b) { e.preventDefault(); a.focus(); }
    };
    document.addEventListener("keydown", onKey);
    return () => { document.removeEventListener("keydown", onKey); prev?.focus(); };
  }, [locked]);

  return ref;
}
