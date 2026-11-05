"use client";

import { useMemo, useState } from "react";
import { TERMS, UNLOCKS, availableIn, isUpper, upcomingTerm, type Course, type Term } from "@/lib/courses";

const ICONS: Record<Term, string> = { Fall: "🍂", Spring: "🌸", Summer: "☀️" };

// "What can I take next term?": every course whose prerequisites you've met, offered in the term you pick
export default function NextTerm({ taken, onSelect, onClose }: {
  taken: Set<string>; onSelect: (code: string) => void; onClose: () => void;
}) {
  const [term, setTerm] = useState<Term>(() => upcomingTerm());
  const courses = useMemo(() => availableIn(term, taken), [term, taken]);
  const groups = [
    { title: "Upper-division EECS", courses: courses.filter((c) => !c.outside && isUpper(c)) },
    { title: "Lower-division EECS", courses: courses.filter((c) => !c.outside && !isUpper(c)) },
    { title: "Outside EECS", courses: courses.filter((c) => c.outside) },
  ].filter((g) => g.courses.length);

  return (
    <section id="next" aria-labelledby="next-title" className="mt-8 scroll-mt-4 rounded-3xl bg-white p-5 shadow-xl shadow-berkeley/10 ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 id="next-title" className="text-2xl font-extrabold tracking-tight text-berkeley dark:text-blue-300">📅 What you can take next</h2>
          <p className="mt-1 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {courses.length} course{courses.length === 1 ? "" : "s"} you&apos;re ready for that {courses.length === 1 ? "has" : "have"} been offered in {term}.
            {" "}Courses that open up the most others come first.
          </p>
        </div>
        <button type="button" onClick={onClose} className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
          Close ✕
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2" role="radiogroup" aria-label="Term">
        {TERMS.map((t) => (
          <button
            key={t}
            type="button"
            role="radio"
            aria-checked={term === t}
            onClick={() => setTerm(t)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
              term === t
                ? "bg-berkeley text-white shadow-md shadow-berkeley/30 dark:bg-gold dark:text-berkeley"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            }`}
          >
            {ICONS[t]} {t}
          </button>
        ))}
      </div>

      {taken.size === 0 && (
        <p className="mt-4 rounded-2xl bg-gold/10 px-4 py-3 text-sm text-slate-700 dark:text-slate-200">
          ✨ You haven&apos;t marked any courses as taken, so this only shows courses with no prerequisites.
          Open a course below and press <strong>I&apos;ve taken this</strong>.
        </p>
      )}

      {groups.map((g) => (
        <div key={g.title} className="mt-6">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            {g.title} <span className="text-gold-dark dark:text-gold">{g.courses.length}</span>
          </h3>
          <ul className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {g.courses.map((c) => <Item key={c.code} course={c} onSelect={onSelect} />)}
          </ul>
        </div>
      ))}

      <p className="mt-6 text-xs text-slate-600 dark:text-slate-400">
        Based on the terms each course was offered recently. Check the{" "}
        <a href="https://classes.berkeley.edu" target="_blank" rel="noopener noreferrer" className="font-semibold text-berkeley-light underline hover:text-gold-dark dark:text-blue-300">
          Class Schedule
        </a>{" "}
        for what&apos;s actually offered, and remember some courses also need a corequisite or instructor consent.
      </p>
    </section>
  );
}

function Item({ course, onSelect }: { course: Course; onSelect: (code: string) => void }) {
  const unlocks = UNLOCKS[course.code]?.length ?? 0;
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(course.code)}
        className="flex w-full items-center gap-3 rounded-2xl bg-slate-50 p-3 text-left ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md hover:ring-gold/60 dark:bg-slate-800/60 dark:ring-slate-700"
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="font-bold text-berkeley dark:text-blue-300">{course.display}</span>
            {course.units && <span className="text-xs text-slate-600 dark:text-slate-400">{course.units}u</span>}
          </span>
          <span className="block truncate text-sm text-slate-600 dark:text-slate-400">{course.title}</span>
        </span>
        {unlocks > 0 && (
          <span className="shrink-0 rounded-full bg-gold/15 px-2 py-0.5 text-xs font-semibold text-gold-dark dark:text-gold" title={`Needed for ${unlocks} other course${unlocks === 1 ? "" : "s"}`}>
            unlocks {unlocks}
          </span>
        )}
      </button>
    </li>
  );
}
