import { beforeAfter, beforeAfterPlaceholder } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function BeforeAfter() {
  return (
    <section id="results" className="section-padding page-x bg-cream">
      <div className="section-inner">
        <FadeIn>
          <SectionLabel>{beforeAfter.label}</SectionLabel>
          <AccentHeading
            title={beforeAfter.title}
            titleAccent={beforeAfter.titleAccent}
            titleEnd={beforeAfter.titleEnd}
            description={beforeAfter.description}
            className="mt-4 max-w-3xl"
          />
        </FadeIn>

        <div className="mt-12 grid gap-8 md:grid-cols-3">
          {beforeAfter.cases.map((caseItem, i) => {
            const before = beforeAfterPlaceholder(caseItem.id, "before");
            const after = beforeAfterPlaceholder(caseItem.id, "after");

            return (
            <FadeIn key={caseItem.id} delay={i * 100}>
              <div className="card card-flush overflow-hidden">
                <div className="grid grid-cols-2 gap-0.5">
                  <ImagePlaceholder
                    label={before.label}
                    src={before.src}
                    aspectRatio="aspect-square"
                    rounded="none"
                    className="placeholder-tl-2xl"
                  />
                  <ImagePlaceholder
                    label={after.label}
                    src={after.src}
                    aspectRatio="aspect-square"
                    rounded="none"
                    className="placeholder-tr-2xl"
                  />
                </div>
                <div className="p-5">
                  <h3 className="font-semibold text-dark">{caseItem.title}</h3>
                  <p className="mt-1 text-sm text-muted">{caseItem.description}</p>
                </div>
              </div>
            </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
