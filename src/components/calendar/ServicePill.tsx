import { formatServicePillLabel, getServicePillStyle } from "@/lib/calendar-mobile";

interface ServicePillProps {
  serviceName: string;
  label?: string;
  size?: "xs" | "sm";
  className?: string;
}

export default function ServicePill({
  serviceName,
  label,
  size = "sm",
  className = "",
}: ServicePillProps) {
  const displayLabel = label ?? serviceName;
  const style = getServicePillStyle(serviceName);
  const sizeClass =
    size === "xs"
      ? "text-[7px] px-1 py-px leading-tight"
      : "text-[10px] px-1.5 py-0.5 leading-tight";

  return (
    <span
      className={`inline-block truncate rounded font-semibold ${sizeClass} ${className}`}
      style={{ backgroundColor: style.bg, color: style.text }}
    >
      {formatServicePillLabel(displayLabel, serviceName)}
    </span>
  );
}
