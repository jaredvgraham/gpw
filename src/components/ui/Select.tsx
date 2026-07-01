import { cn } from "@/lib/cn";
import Dropdown from "@/components/ui/Dropdown";

interface SelectProps extends Omit<React.SelectHTMLAttributes<HTMLSelectElement>, "onChange"> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
  onChange?: (e: React.ChangeEvent<HTMLSelectElement>) => void;
}

export default function Select({
  label,
  error,
  options,
  className,
  id,
  value = "",
  onChange,
  disabled,
  required,
  name,
  onBlur,
}: SelectProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  function handleChange(next: string) {
    onChange?.({
      target: { value: next, name: name ?? "" },
    } as React.ChangeEvent<HTMLSelectElement>);
    onBlur?.({} as React.FocusEvent<HTMLSelectElement>);
  }

  return (
    <div className={cn("space-y-1", className)}>
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {required && <span className="text-brand-red ml-0.5">*</span>}
        </label>
      )}
      <Dropdown
        id={inputId}
        value={String(value)}
        onChange={handleChange}
        options={options}
        error={Boolean(error)}
        disabled={disabled}
        ariaLabel={label}
      />
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
