import { team, teamPlaceholder } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { ImagePlaceholder } from "@/components/ui/ImagePlaceholder";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function Team() {
  return (
    <section id="team" className="section-padding page-x">
      <div className="section-inner">
        <FadeIn>
          <SectionLabel>{team.label}</SectionLabel>
          <AccentHeading
            title={team.title}
            titleAccent={team.titleAccent}
            titleEnd={team.titleEnd}
            description={team.description}
            align="center"
            className="mt-4"
          />
        </FadeIn>

        <div className="mt-12 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {team.members.map((member, i) => {
            const portrait = teamPlaceholder(member.id, member.name);

            return (
            <FadeIn key={member.id} delay={i * 100}>
              <div className="card text-center">
                <ImagePlaceholder
                  label={portrait.label}
                  src={portrait.src}
                  aspectRatio="aspect-square"
                  className="mx-auto mb-5 max-w-[200px]"
                  rounded="full"
                />
                <h3 className="text-lg font-semibold text-dark">{member.name}</h3>
                <p className="mt-1 text-sm font-medium text-primary">{member.role}</p>
                <p className="mt-3 text-sm leading-relaxed text-muted">{member.bio}</p>
              </div>
            </FadeIn>
            );
          })}
        </div>
      </div>
    </section>
  );
}
