"use client";

import { useEffect, useRef, useState } from "react";

interface Stat {
  value: number;
  suffix: string;
  label: string;
}

interface CountUpStatsProps {
  stats: Stat[];
}

function useCountUp(target: number, active: boolean, duration = 2000): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!active) return;

    let start = 0;
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      start = Math.round(eased * target);
      setCount(start);
      if (progress < 1) requestAnimationFrame(step);
    };

    requestAnimationFrame(step);
  }, [target, active, duration]);

  return count;
}

function StatItem({ stat, active, delay }: { stat: Stat; active: boolean; delay: number }) {
  const count = useCountUp(stat.value, active);

  return (
    <div
      className="text-center transition-all duration-700"
      style={{ transitionDelay: `${delay}ms` }}
    >
      <p className="text-4xl font-bold text-primary md:text-5xl">
        {count.toLocaleString()}
        {stat.suffix}
      </p>
      <p className="mt-2 text-sm font-medium text-muted">{stat.label}</p>
    </div>
  );
}

export function CountUpStats({ stats }: CountUpStatsProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setActive(true);
          observer.unobserve(el);
        }
      },
      { threshold: 0.3 }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="grid grid-cols-2 gap-8 md:grid-cols-4">
      {stats.map((stat, i) => (
        <StatItem key={stat.label} stat={stat} active={active} delay={i * 100} />
      ))}
    </div>
  );
}
