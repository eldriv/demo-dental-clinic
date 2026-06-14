"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { faq } from "@/content";
import { AccentHeading } from "@/components/ui/AccentHeading";
import { SectionLabel } from "@/components/ui/SectionLabel";

export function FAQ() {
  const [activeCategory, setActiveCategory] = useState(faq.categories[0].id);
  const [openItem, setOpenItem] = useState<string | null>(null);

  const category = faq.categories.find((c) => c.id === activeCategory)!;

  return (
    <section id="faq" className="section-padding page-x bg-cream">
      <div className="section-inner">
        <SectionLabel>{faq.label}</SectionLabel>
        <AccentHeading
          title={faq.title}
          titleAccent={faq.titleAccent}
          className="mt-4 max-w-3xl"
        />

        <div className="mt-10 flex flex-wrap gap-2">
          {faq.categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setActiveCategory(cat.id);
                setOpenItem(null);
              }}
              className={`rounded-full px-5 py-2 text-sm font-medium transition-colors ${
                activeCategory === cat.id
                  ? "bg-primary text-white shadow-sm"
                  : "bg-white text-gray-600 ring-1 ring-gray-200 hover:ring-primary/30"
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        <div className="mt-8 space-y-3">
          {category.items.map((item) => {
            const itemKey = `${activeCategory}-${item.question}`;
            const isOpen = openItem === itemKey;

            return (
              <div
                key={itemKey}
                className="overflow-hidden rounded-2xl bg-white ring-1 ring-gray-100"
              >
                <button
                  type="button"
                  onClick={() => setOpenItem(isOpen ? null : itemKey)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="text-sm font-semibold text-dark md:text-base">
                    {item.question}
                  </span>
                  <ChevronDown
                    className={`size-5 shrink-0 text-primary transition-transform duration-200 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  />
                </button>
                <div
                  className={`grid transition-all duration-200 ${
                    isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                  }`}
                >
                  <div className="overflow-hidden">
                    <p className="px-6 pb-5 text-sm leading-relaxed text-muted">
                      {item.answer}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
