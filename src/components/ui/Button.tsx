import { cn } from "@/lib/cn";

const variants = {
  primary: "bg-brand-blue text-white hover:bg-blue-800",
  danger: "bg-brand-red text-white hover:bg-red-700",
  secondary: "bg-white text-gray-700 border border-brand-border hover:bg-brand-gray",
  success: "bg-green-600 text-white hover:bg-green-700",
  ghost: "text-gray-600 hover:bg-brand-gray",
};

const sizes = {
  sm: "px-3 py-1.5 text-xs",
  md: "px-4 py-2 text-sm",
  lg: "px-6 py-3 text-base",
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: keyof typeof variants;
  size?: keyof typeof sizes;
}

export default function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed",
        variants[variant],
        sizes[size],
        className
      )}
      {...props}
    >
      {children}
    </button>
  );
}
