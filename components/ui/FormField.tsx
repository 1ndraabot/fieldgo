import type { ReactNode } from "react";

/** Kelas input sesuai desain (.inp). `error` memberi gaya galat. */
export const inputClass = (error?: boolean) =>
  `h-[54px] w-full rounded-[18px] border-[1.5px] px-[18px] text-base font-medium focus:outline-none focus:ring-4 focus:ring-f3/20 ${
    error ? "border-[#B42328] bg-[#FFFAFA]" : "border-line bg-white focus:border-f5"
  }`;

type Props = { id: string; label: string; error?: string; hint?: string; children: ReactNode };

/** Label + kontrol + pesan galat/petunjuk. Kontrol harus memakai id yang sama dan aria-describedby `${id}-msg`. */
export default function FormField({ id, label, error, hint, children }: Props) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm font-bold">{label}</label>
      {children}
      <div id={`${id}-msg`}>
        {error ? (
          <p className="text-[13px] font-bold text-[#B42328]">{error}</p>
        ) : hint ? (
          <p className="text-[13px] font-medium text-muted">{hint}</p>
        ) : null}
      </div>
    </div>
  );
}

/** Kelas textarea sesuai desain. */
export const textareaClass = (error?: boolean) =>
  `block w-full resize-y rounded-[18px] border-[1.5px] px-[18px] py-3.5 text-[15px] leading-[1.5] focus:outline-none focus:ring-4 focus:ring-f3/20 ${
    error ? "border-[#B42328] bg-[#FFFAFA]" : "border-line bg-white focus:border-f5"
  }`;
