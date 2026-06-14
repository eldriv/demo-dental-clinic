interface SectionLabelProps {
  children: React.ReactNode;
  className?: string;
  variant?: "default" | "on-dark";
}

export function SectionLabel({
  children,
  className = "",
  variant = "default",
}: SectionLabelProps) {
  const variantClass =
    variant === "on-dark"
      ? "bg-white/10 text-accent-light"
      : "bg-primary/10 text-primary";

  return (
    <span
      className={`inline-flex items-center rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-wider ${variantClass} ${className}`}
    >
      {children}
    </span>
  );
}
