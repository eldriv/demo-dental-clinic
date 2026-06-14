import { services, servicesIntro, placeholders } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { ServiceCard } from "@/components/sections/ServiceCard";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function Services() {
  return (
    <section id="services" className="section-padding page-x">
      <div className="section-inner">
        <FadeIn>
          <SectionLabel>{servicesIntro.label}</SectionLabel>
          <AccentHeading
            title={servicesIntro.title}
            titleAccent={servicesIntro.titleAccent}
            titleEnd={servicesIntro.titleEnd}
            description={servicesIntro.description}
            className="mt-4 max-w-3xl"
          />
        </FadeIn>

        <div className="mt-12 grid gap-8 lg:grid-cols-[280px_1fr] xl:grid-cols-[320px_1fr]">
          <FadeIn delay={100} className="hidden lg:block">
            <div className="sticky top-28">
              <ImagePlaceholder
                label={placeholders.services.label}
                src={placeholders.services.src}
                aspectRatio="aspect-3/4"
                className="shadow-lg ring-1 ring-primary/10"
              />
            </div>
          </FadeIn>

          <div className="grid gap-4 sm:grid-cols-2">
            {services.map((service, i) => (
              <FadeIn key={service.id} delay={50 + (i % 4) * 50}>
                <ServiceCard service={service} />
              </FadeIn>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
