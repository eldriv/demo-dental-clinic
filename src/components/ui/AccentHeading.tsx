interface AccentHeadingProps {
  label?: string;
  title: string;
  titleAccent?: string;
  titleEnd?: string;
  description?: string;
  align?: "left" | "center";
  className?: string;
}

export function AccentHeading({
  label,
  title,
  titleAccent,
  titleEnd,
  description,
  align = "left",
  className = "",
}: AccentHeadingProps) {
  const alignClass = align === "center" ? "text-center mx-auto" : "";

  return (
    <div className={`max-w-2xl ${alignClass} ${className}`}>
      {label && (
        <p className="mb-4 text-sm font-semibold uppercase tracking-wider text-primary">{label}</p>
      )}
      <h2 className="text-3xl font-bold tracking-tight text-dark md:text-4xl lg:text-5xl">
        {title}{" "}
        {titleAccent && (
          <span className="font-display italic text-accent">{titleAccent}</span>
        )}
        {titleEnd && <> {titleEnd}</>}
      </h2>
      {description && (
        <p className="mt-4 text-base leading-relaxed text-muted md:text-lg">{description}</p>
      )}
    </div>
  );
}
