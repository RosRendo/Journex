"use client";

import { Reveal } from "./Reveal";

const PAINS = [
  {
    n: "01",
    title: "You trade from intuition and memory",
    body: "After a fast session, your brain remembers the wins and suppresses the sloppy entries. Two weeks later you can't tell whether your edge came from your plan or accidental volatility.",
  },
  {
    n: "02",
    title: "Execution errors compound silently",
    body: "The revenge trade, entering before high-impact CPI embargo clearance, and moving your stop loss feel reasonable in the heat of the moment. Without a real-time risk enforcer, they cost you every month.",
  },
  {
    n: "03",
    title: "Performance is an emotional feeling, not a number",
    body: "“I think I have an edge on Gold” is not mathematical expectancy. Without measuring R-multiples, session win rates, and Sharpe ratios per setup, you end up scaling strategies that bleed capital.",
  },
  {
    n: "04",
    title: "Disconnected from institutional exchange depth",
    body: "Trading spot CFDs without understanding COMEX Globex futures volume, CME cumulative volume delta (CVD), and COT positioning leaves you on the wrong side of the institutional sweep.",
  },
];

export default function Problem() {
  return (
    <section className="border-t border-white/[0.08] bg-[#09090e] relative">
      <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-14 px-5 py-24 sm:px-8 lg:grid-cols-12 lg:py-32">
        <div className="lg:col-span-5">
          <Reveal>
            <p className="mb-4 font-mono text-[11px] font-bold uppercase tracking-[0.18em] text-[#20e0b2]">
              The Execution Gap
            </p>
            <h2 className="text-3xl font-extrabold leading-[1.1] tracking-[-0.02em] sm:text-[40px] text-white">
              Most traders don&apos;t have a setup problem. They have a telemetry problem.
            </h2>
            <p className="mt-5 max-w-sm text-[15px] leading-relaxed text-zinc-400">
              A trading edge is only as viable as its execution. Execution can only
              improve if it&apos;s measured automatically from the raw broker tick stream — completely
              free of hindsight bias and emotion.
            </p>
          </Reveal>
        </div>

        <div className="lg:col-span-7">
          <div className="divide-y divide-white/[0.08] border-y border-white/[0.08]">
            {PAINS.map((p, i) => (
              <Reveal key={p.n} delay={i * 0.06}>
                <div className="grid grid-cols-[auto_1fr] gap-4 py-6 sm:gap-7 group hover:bg-white/[0.015] px-2 rounded-lg transition-colors">
                  <span className="pt-1 font-mono text-[12px] font-bold text-[#20e0b2]">{p.n}</span>
                  <div>
                    <h3 className="text-base font-bold tracking-tight text-white group-hover:text-[#20e0b2] transition-colors">
                      {p.title}
                    </h3>
                    <p className="mt-2 max-w-lg text-sm leading-relaxed text-zinc-400">
                      {p.body}
                    </p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
