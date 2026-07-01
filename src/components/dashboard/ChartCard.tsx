import Card from "@/components/ui/Card";

export default function ChartCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <div className="px-5 pt-5 pb-1 border-b border-brand-border">
        <h2 className="text-base font-semibold text-brand-black">{title}</h2>
        {description && <p className="mt-0.5 text-sm text-gray-500">{description}</p>}
      </div>
      <div className="p-5">{children}</div>
    </Card>
  );
}
