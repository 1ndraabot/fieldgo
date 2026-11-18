"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { validateProofFile, type ProofKind } from "@/lib/proof-file";

export type Proof = { file: File; name: string; size: number; kind: ProofKind; url: string | null };

/** State berkas bukti: validasi, pratinjau (object URL), dan pembersihan memori. Tidak mengunggah apa pun. */
export function useProofFile() {
  const [proof, setProof] = useState<Proof | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [checking, setChecking] = useState(false);
  const urlRef = useRef<string | null>(null);
  const seq = useRef(0);

  const release = useCallback(() => {
    if (urlRef.current) { URL.revokeObjectURL(urlRef.current); urlRef.current = null; }
  }, []);
  useEffect(() => release, [release]);

  const pick = useCallback(async (file: File) => {
    const mine = ++seq.current;
    setChecking(true);
    const r = await validateProofFile(file);
    if (mine !== seq.current) return; // ada pilihan yang lebih baru
    setChecking(false);
    release();
    if (!r.ok) { setProof(null); setError(r.message); return; }
    const url = r.kind === "image" ? URL.createObjectURL(file) : null;
    urlRef.current = url;
    setError(null);
    setProof({ file, name: file.name, size: file.size, kind: r.kind, url });
  }, [release]);

  const clear = useCallback(() => { seq.current++; release(); setProof(null); setError(null); setChecking(false); }, [release]);

  return { proof, error, checking, pick, clear };
}
