import { cn } from "@/lib/cn";

interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export default function Textarea({ label, error, className, id, ...props }: TextareaProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1">
      {label && (
        <label htmlFor={inputId} className="block text-sm font-medium text-gray-700">
          {label}
        </label>
      )}
      <textarea
        id={inputId}
        rows={3}
        className={cn(
          "w-full rounded-lg border border-brand-border px-3 py-2 text-base md:text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-brand-blue focus:border-transparent resize-y",
          error && "border-brand-red focus:ring-brand-red",
          className
        )}
        {...props}
      />
      {error && <p className="text-xs text-brand-red">{error}</p>}
    </div>
  );
}
