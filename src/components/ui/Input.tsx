import { cn } from "@/lib/cn";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export default function Input({ label, error, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
          {props.required && <span className="text-brand-red ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        className={cn(
          "w-full rounded-lg border border-brand-border px-3 py-2 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent",
          error && "border-brand-red focus:ring-brand-red",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
