"use client";

import { useState, type FormEvent } from "react";
import FormField, { inputClass } from "@/components/ui/FormField";
import Button from "@/components/ui/Button";

type Props = {
  title: string;
  lead: string;
  rows: { name: string; count: number }[];
  label: string;
  placeholder: string;
  inputId: string;
  /** mengembalikan pesan galat, atau null bila berhasil */
  onAdd: (name: string) => string | null;
};

/** Daftar nama + jumlah lapangan, dan form tambah (dipakai untuk Jenis olahraga dan Fasilitas). */
export default function NameListTab({ title, lead, rows, label, placeholder, inputId, onAdd }: Props) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const err = onAdd(value);
    setError(err);
    if (!err) setValue("");
  };

  return (
    <section aria-label={title} className="mt-6 max-w-[760px] rounded-[32px] border-[1.5px] border-line bg-white p-7 shadow-[0_18px_40px_rgba(8,44,28,.08)]">
      <h2 className="font-display text-[clamp(24px,2.6vw,32px)] font-bold leading-[1.2] tracking-[-0.03em]">{title}</h2>
      <p className="mb-5 mt-2 text-[15px] leading-[1.65] text-muted">{lead}</p>
      <ul className="flex list-none flex-col gap-2.5 p-0">
        {rows.map((r) => (
          <li key={r.name} className="flex items-center justify-between gap-3 rounded-[20px] border border-line bg-f0 px-[18px] py-3.5">
            <b>{r.name}</b>
            <span className="inline-flex h-[30px] items-center rounded-full bg-f1 px-3.5 text-[13px] font-bold text-f6">{r.count} lapangan</span>
          </li>
        ))}
      </ul>
      <form onSubmit={submit} noValidate className="mt-[22px] flex flex-wrap items-start gap-3">
        <div className="min-w-[240px] flex-[1_1_240px]">
          <FormField id={inputId} label={label} error={error ?? undefined}>
            <input
              id={inputId} value={value} placeholder={placeholder} autoComplete="off"
              onChange={(e) => { setValue(e.target.value); if (error) setError(null); }}
              aria-invalid={error ? true : undefined} aria-describedby={`${inputId}-msg`}
              className={inputClass(!!error)}
            />
          </FormField>
        </div>
        <Button type="submit" className="mt-[30px]">Tambah</Button>
      </form>
    </section>
  );
}
