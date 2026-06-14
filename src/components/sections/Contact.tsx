import { site, contact } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { FadeIn } from "@/components/ui/FadeIn";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { MapPin, Phone, Mail, Clock } from "lucide-react";

export function Contact() {
  return (
    <section id="contact" className="section-padding page-x">
      <div className="section-inner">
        <FadeIn>
          <SectionLabel>{contact.label}</SectionLabel>
          <AccentHeading
            title={contact.title}
            titleAccent={contact.titleAccent}
            titleEnd={contact.titleEnd}
            description={contact.description}
            className="mt-4 max-w-3xl"
          />
        </FadeIn>

        <div className="mt-12 grid gap-8 lg:grid-cols-2">
          <FadeIn delay={100}>
            <div className="overflow-hidden rounded-2xl ring-1 ring-gray-200">
              <iframe
                title="Clinic location on Google Maps"
                src={site.location.mapEmbedUrl}
                className="aspect-4/3 w-full border-0 lg:aspect-auto lg:min-h-[400px]"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
                allowFullScreen
              />
            </div>
          </FadeIn>

          <FadeIn delay={200}>
            <div className="card flex h-full flex-col justify-center gap-6">
              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <MapPin className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark">Address</h3>
                  <p className="mt-1 text-sm text-muted">{site.location.full}</p>
                  <p className="mt-1 text-xs text-muted/80">
                    Near {site.location.landmark}
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Phone className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark">Phone</h3>
                  {site.contact.phones.map((phone) => (
                    <p key={phone} className="mt-1 text-sm text-muted">
                      {phone}
                    </p>
                  ))}
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Mail className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark">Email</h3>
                  <p className="mt-1 text-sm text-muted">{site.contact.email}</p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <Clock className="size-5" />
                </div>
                <div>
                  <h3 className="font-semibold text-dark">Hours</h3>
                  <p className="mt-1 text-sm text-muted">{site.hours.summary}</p>
                  <ul className="mt-2 space-y-1">
                    {site.hours.schedule.map((item) => (
                      <li key={item.days} className="text-xs text-muted">
                        <span className="font-medium text-gray-700">{item.days}:</span>{" "}
                        {item.hours}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          </FadeIn>
        </div>
      </div>
    </section>
  );
}
