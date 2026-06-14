import { Star, Quote } from "lucide-react";
import { testimonials } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function Testimonials() {
  return (
    <section id="reviews" className="section-padding page-x bg-surface">
      <div className="section-inner">
        <FadeIn>
          <SectionLabel>{testimonials.label}</SectionLabel>
          <AccentHeading
            title={testimonials.title}
            titleAccent={testimonials.titleAccent}
            titleEnd={testimonials.titleEnd}
            align="center"
            className="mt-4"
          />
        </FadeIn>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {testimonials.quotes.map((quote, i) => (
            <FadeIn key={quote.id} delay={i * 100}>
              <div className="card relative flex h-full flex-col">
                <Quote className="absolute right-5 top-5 size-8 text-primary/10" />
                <div className="mb-4 flex gap-0.5">
                  {Array.from({ length: quote.rating }).map((_, j) => (
                    <Star key={j} className="size-4 fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-gray-700">
                  &ldquo;{quote.text}&rdquo;
                </p>
                <div className="mt-5 border-t border-gray-100 pt-4">
                  <p className="text-sm font-semibold text-dark">{quote.author}</p>
                  <p className="text-xs text-muted">{quote.service}</p>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  );
}
