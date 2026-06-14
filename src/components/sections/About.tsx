import { about, placeholders } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { CountUpStats } from "@/components/ui/CountUpStats";
import { FadeIn } from "@/components/ui/FadeIn";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function About() {
  return (
    <section id="about" className="section-padding page-x bg-surface">
      <div className="section-inner">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <FadeIn>
            <ImagePlaceholder
              label={placeholders.about.label}
              src={placeholders.about.src}
              aspectRatio="aspect-4/5"
              className="shadow-lg ring-1 ring-primary/10"
            />
          </FadeIn>

          <div>
            <FadeIn>
              <SectionLabel>{about.label}</SectionLabel>
              <AccentHeading
                title={about.title}
                titleAccent={about.titleAccent}
                titleEnd={about.titleEnd}
                className="mt-4 max-w-none"
              />
            </FadeIn>
            <FadeIn delay={150}>
              <div className="mt-6 space-y-4 text-base leading-relaxed text-muted">
                {about.story.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            </FadeIn>
          </div>
        </div>

        <FadeIn delay={300}>
          <div className="mt-16 rounded-3xl bg-white p-8 shadow-sm ring-1 ring-gray-100 md:p-12">
            <CountUpStats stats={about.stats} />
          </div>
        </FadeIn>
      </div>
    </section>
  );
}
