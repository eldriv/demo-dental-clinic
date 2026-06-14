import Link from "next/link";
import { placeholders } from "@/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";

interface LogoProps {
  variant?: "default" | "light";
  className?: string;
}

export function Logo({ variant = "default", className = "" }: LogoProps) {
  const textColor = variant === "light" ? "text-white" : "text-dark";

  return (
    <Link href="/" className={`flex items-center gap-2.5 ${className}`}>
      <ImagePlaceholder
        label={placeholders.logo.label}
        src={placeholders.logo.src}
        aspectRatio="aspect-square"
        rounded="xl"
        className="size-10 shrink-0"
        sizes="40px"
        priority
      />
      <div className="flex flex-col leading-tight">
        <span className={`text-sm font-bold tracking-tight ${textColor}`}>
          SmileCare
        </span>
        <span
          className={`text-[10px] font-medium uppercase tracking-widest ${
            variant === "light" ? "text-white/70" : "text-primary"
          }`}
        >
          Dental Clinic
        </span>
      </div>
    </Link>
  );
}
