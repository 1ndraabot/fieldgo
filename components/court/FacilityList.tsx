import { CheckIcon } from "@/components/ui/Icons";

export default function FacilityList({ items }: { items: string[] }) {
  return (
    <ul className="flex flex-wrap gap-2.5">
      {items.map((name) => (
        <li key={name} className="inline-flex items-center gap-2 rounded-full border border-line bg-f0 py-2.5 pl-3 pr-[18px] text-[15px] font-semibold">
          <span className="flex h-[22px] w-[22px] items-center justify-center rounded-full bg-f5">
            <CheckIcon size={12} stroke="#fff" strokeWidth={3.4} />
          </span>
          {name}
        </li>
      ))}
    </ul>
  );
}
