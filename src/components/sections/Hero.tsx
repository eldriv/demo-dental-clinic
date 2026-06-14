import Link from "next/link";
import { Star, ArrowRight } from "lucide-react";
import { hero, placeholders } from "@/content";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { FadeIn } from "@/components/ui/FadeIn";

export function Hero() {
  return (
    <section
      id="hero"
      className="relative flex min-h-dvh items-center overflow-hidden"
    >
      <div className="absolute inset-0">
        <ImagePlaceholder
          label={placeholders.hero.main.label}
          src={placeholders.hero.main.src}
          aspectRatio="aspect-auto"
          rounded="none"
          className="placeholder-cover absolute inset-0 h-full w-full"
          sizes="100vw"
          priority
        />
        <div className="absolute inset-0 bg-linear-to-r from-white via-white/95 to-white/60" />
        <div className="absolute inset-0 bg-linear-to-t from-white/80 via-transparent to-transparent" />
      </div>

      <div className="relative z-10 w-full section-padding page-x pt-28 md:pt-32">
        <div className="section-inner">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <FadeIn>
              <SectionLabel>{hero.label}</SectionLabel>
              <h1 className="mt-4 text-4xl font-bold leading-[1.1] tracking-tight text-dark sm:text-5xl lg:text-6xl">
                {hero.titleLine1}
                <br />
                <span className="inline-flex items-center gap-3">
                  <span className="font-display italic text-accent">{hero.titleAccent}</span>
                  <span className="inline-block size-12 overflow-hidden rounded-xl ring-2 ring-primary/20 sm:size-14">
                    <ImagePlaceholder
                      label={placeholders.hero.accent.label}
                      src={placeholders.hero.accent.src}
                      aspectRatio="aspect-square"
                      rounded="none"
                      className="placeholder-fill"
                      sizes="56px"
                    />
                  </span>
                </span>
                <br />
                {hero.titleLine2}
              </h1>
              <p className="mt-6 max-w-lg text-base leading-relaxed text-muted md:text-lg">
                {hero.description}
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-4">
                <Link href={hero.ctaPrimary.href} className="btn-cta">
                  {hero.ctaPrimary.label}
                  <ArrowRight className="size-4" />
                </Link>
                <Link href={hero.ctaSecondary.href} className="btn-outline">
                  {hero.ctaSecondary.label}
                </Link>
              </div>
              <div className="mt-10 flex items-center gap-4">
                <div className="flex -space-x-3">
                  {Array.from({ length: hero.patientAvatars }).map((_, i) => (
                    <div
                      key={i}
                      className="size-10 rounded-full bg-linear-to-br from-primary/30 to-accent/30 ring-2 ring-white"
                    />
                  ))}
                </div>
                <div>
                  <div className="flex items-center gap-1">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className="size-4 fill-amber-400 text-amber-400"
                      />
                    ))}
                    <span className="ml-1 text-sm font-bold text-dark">
                      {hero.rating}
                    </span>
                  </div>
                  <p className="text-xs text-muted">
                    from {hero.reviewCount}+ reviews
                  </p>
                </div>
              </div>
            </FadeIn>

            <FadeIn delay={200} className="hidden lg:block">
              <ImagePlaceholder
                label={placeholders.hero.main.label}
                src={placeholders.hero.main.src}
                aspectRatio="aspect-4/5"
                className="ml-auto max-w-md shadow-xl ring-1 ring-primary/10"
              />
            </FadeIn>
          </div>
        </div>
      </div>
    </section>
  );
}
