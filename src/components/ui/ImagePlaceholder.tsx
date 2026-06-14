import Image from "next/image";
import { ImageIcon } from "lucide-react";

interface ImagePlaceholderProps {
  label: string;
  src?: string;
  aspectRatio?: string;
  className?: string;
  rounded?: "lg" | "xl" | "2xl" | "3xl" | "full" | "none";
  priority?: boolean;
  sizes?: string;
}

const roundedMap = {
  lg: "rounded-lg",
  xl: "rounded-xl",
  "2xl": "rounded-2xl",
  "3xl": "rounded-3xl",
  full: "rounded-full",
  none: "",
};

export function ImagePlaceholder({
  label,
  src,
  aspectRatio = "aspect-4/3",
  className = "",
  rounded = "2xl",
  priority = false,
  sizes = "(max-width: 768px) 100vw, 50vw",
}: ImagePlaceholderProps) {
  const roundedClass = roundedMap[rounded];

  if (src) {
    return (
      <div
        className={`relative overflow-hidden bg-surface ${aspectRatio} ${roundedClass} ${className}`}
      >
        <Image
          src={src}
          alt={label}
          fill
          className="object-cover"
          sizes={sizes}
          priority={priority}
        />
      </div>
    );
  }

  return (
    <div
      className={`relative flex items-center justify-center border-2 border-dashed border-primary/25 bg-surface ${aspectRatio} ${roundedClass} ${className}`}
      role="img"
      aria-label={label}
    >
      <div className="flex flex-col items-center gap-2 px-4 text-center">
        <ImageIcon className="size-8 text-primary/40" strokeWidth={1.5} />
        <span className="text-xs font-medium text-primary/60">{label}</span>
      </div>
    </div>
  );
}
