import { AD_SOURCE_LABELS, type AdSource } from "@/lib/ad-source";

const OPTIONS: { id: AdSource | ""; label: string }[] = [
  { id: "", label: "None" },
  { id: "google", label: AD_SOURCE_LABELS.google },
  { id: "meta", label: AD_SOURCE_LABELS.meta },
];

export default function AdSourcePicker({
  value,
  onChange,
  disabled = false,
}: {
  value?: AdSource | "";
  onChange: (value: AdSource | "") => void;
  disabled?: boolean;
}) {
  const current = value ?? "";

  return (
    <div className="inline-flex flex-wrap gap-1">
      {OPTIONS.map((option) => {
        const selected = option.id === current;
        return (
          <button
            key={option.id || "none"}
            type="button"
            disabled={disabled}
            aria-pressed={selected}
            onClick={() => onChange(option.id)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-semibold transition-colors disabled:opacity-60 ${
              selected
                ? "bg-brand-black text-white"
                : "text-gray-500 hover:text-brand-black disabled:hover:text-gray-500"
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}
