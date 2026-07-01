import { cn } from "@/lib/cn";

export default function Card({
  children,
  className,
  title,
  action,
}: {
  children: React.ReactNode;
  className?: string;
  title?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className={cn("rounded-xl bg-white border border-brand-border shadow-sm", className)}>
      {(title || action) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-brand-border">
          {title && <h2 className="text-base font-semibold text-brand-black">{title}</h2>}
          {action}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}
