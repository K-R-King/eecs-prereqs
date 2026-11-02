import { CHECKED } from "@/lib/courses";
import { siteUrl } from "@/lib/suite";

const STEPS = [
  { icon: "🔍", title: "Find a course", text: "Search by code, name, or area. Press / anywhere to jump to search." },
  { icon: "🧭", title: "Follow the chain", text: "See everything it needs, back to the first class, and what it unlocks." },
  { icon: "✅", title: "Mark what you've taken", text: "Every course then shows whether you're ready, saved in this browser." },
];

const SIBLINGS = [
  { id: "planner", icon: "🗺️", title: "EECS Planner", text: "Map your whole degree, semester by semester.", cta: "Open the planner →" },
  { id: "electives", icon: "🎯", title: "EECS Electives", text: "Find the upper-division electives that fit you.", cta: "Find electives →" },
  { id: "links", icon: "🔗", title: "EECS Links", text: "Every important Berkeley link in one place.", cta: "Open the links →" },
] as const;

export default function Footer() {
  return (
    <footer className="relative mt-24 overflow-hidden bg-linear-to-br from-berkeley-dark via-berkeley to-[#0b4a7a] px-4 pt-16 pb-10 text-white">
      <div className="hero-grid pointer-events-none absolute inset-0" />
      <div className="pointer-events-none absolute -bottom-24 left-1/3 h-72 w-72 animate-aurora rounded-full bg-gold/20 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">
          How it <span className="text-gold">works</span>
        </h2>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {STEPS.map((s, i) => (
            <div
              key={s.title}
              className="rounded-2xl border border-white/10 bg-white/5 p-6 backdrop-blur transition hover:-translate-y-1 hover:border-gold/40"
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">{s.icon}</span>
                <span className="text-xs font-bold text-gold">STEP {i + 1}</span>
              </div>
              <p className="mt-3 font-semibold">{s.title}</p>
              <p className="mt-1 text-sm text-blue-200">{s.text}</p>
            </div>
          ))}
        </div>

        <div className="mt-10 grid gap-5 sm:grid-cols-3">
          {SIBLINGS.map((s) => (
            <a
              key={s.id}
              href={siteUrl(s.id)}
              className="group flex flex-col justify-between gap-4 rounded-2xl border border-gold/30 bg-gold/10 p-6 transition hover:border-gold"
            >
              <span>
                <span className="block font-semibold">{s.icon} {s.title}</span>
                <span className="block text-sm text-blue-200">{s.text}</span>
              </span>
              <span className="self-start rounded-xl bg-gold px-5 py-2.5 text-sm font-semibold text-berkeley shadow-lg shadow-gold/30 transition group-hover:-translate-y-0.5">
                {s.cta}
              </span>
            </a>
          ))}
        </div>

        <div className="mt-14 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-sm sm:flex-row">
          <div className="flex items-center gap-2 font-semibold">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/icon.svg" alt="" className="h-7 w-7" />
            EECS Prereqs
          </div>
          <p className="text-center text-xs text-blue-200">
            Unofficial student tool. Prerequisites from the EECS department&apos;s course pages, checked {CHECKED}.
            <br />Always confirm with the Class Schedule or your advisor.
          </p>
          <a href="#top" className="rounded-full border border-white/20 px-4 py-1.5 text-xs transition hover:border-gold hover:text-gold">
            Back to top ↑
          </a>
        </div>
      </div>
    </footer>
  );
}
