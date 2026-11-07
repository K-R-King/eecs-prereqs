"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import ChainDiagram from "@/components/ChainDiagram";
import NextTerm from "@/components/NextTerm";
import {
  COURSES, DECALS, EECS_COURSES, KIND_LABELS, OUTSIDE_COURSES, UNLOCKS, byCode, dept, isUpper, matches, missingGroups, type Course,
} from "@/lib/courses";
import { rememberedTaken, rememberTaken, takeIncoming } from "@/lib/handoff";
import { loadTaken, saveTaken } from "@/lib/taken";

// saves the taken list here and hands it to the sister sites (keeping any courses this site doesn't list)
function storeTaken(codes: string[]) {
  saveTaken(codes);
  rememberTaken([...codes, ...rememberedTaken().filter((c) => !COURSES[c])]);
}

const DEFAULT_COURSE = "CS189";

const LEVELS = [
  { id: "all", label: "All" },
  { id: "lower", label: "Lower division" },
  { id: "upper", label: "Upper division" },
  { id: "outside", label: "Outside EECS" },
  { id: "special", label: "Seminars & DeCals" },
] as const;
type Level = (typeof LEVELS)[number]["id"];

const DEPTS = ["CS", "EE", "EECS"];
const AREAS = [...new Set(EECS_COURSES.flatMap((c) => c.areas ?? []))].sort();

function codeFromHash() {
  try {
    const code = decodeURIComponent(window.location.hash.slice(1)).toUpperCase();
    return COURSES[code] ? code : null;
  } catch {
    return null;  // a damaged link, like #%E0%A4%A
  }
}

export default function Explorer() {
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<Level>("all");
  const [depts, setDepts] = useState<string[]>([]);
  const [area, setArea] = useState("");
  const [readyOnly, setReadyOnly] = useState(false);
  const [taken, setTaken] = useState<string[]>([]);
  const [selected, setSelected] = useState(DEFAULT_COURSE);
  // "What can I take next term?" (also opened by links to #next)
  const [showNext, setShowNext] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);
  const detailRef = useRef<HTMLDivElement>(null);

  // taken courses and the linked course (#CS170) live in the browser, so read them after the first render
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect */
    // plus any marked as taken on a sister site (?taken=...)
    const incoming = (takeIncoming() ?? []).filter((c) => COURSES[c]);
    const startTaken = [...new Set([...loadTaken(), ...incoming])];
    setTaken(startTaken);
    storeTaken(startTaken);
    setSelected(codeFromHash() ?? DEFAULT_COURSE);
    if (window.location.hash.toLowerCase() === "#next") setShowNext(true);
    /* eslint-enable react-hooks/set-state-in-effect */
    const onHash = () => {
      const code = codeFromHash();
      if (code) setSelected(code);
    };
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  // "/" jumps to the search box
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const target = e.target as HTMLElement;
      if (e.key === "/" && !["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const takenSet = useMemo(() => new Set(taken), [taken]);

  function select(code: string) {
    setSelected(code);
    history.replaceState(null, "", `#${code}`);
    // on phones the details sit above the list, so bring them back into view
    if (window.innerWidth < 1024) detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  // bring the panel into view when it opens
  useEffect(() => {
    if (showNext) document.getElementById("next")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [showNext]);

  // a course picked from the panel: show its details (they sit below the panel)
  function selectFromNext(code: string) {
    setSelected(code);
    history.replaceState(null, "", `#${code}`);
    detailRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function toggleTaken(code: string) {
    const next = takenSet.has(code) ? taken.filter((c) => c !== code) : [...taken, code];
    setTaken(next);
    storeTaken(next);
  }

  function clearTaken() {
    setTaken([]);
    storeTaken([]);
    setReadyOnly(false);
  }

  const visible = useMemo(() => {
    const pool = level === "outside" ? OUTSIDE_COURSES : level === "all" ? [...EECS_COURSES, ...OUTSIDE_COURSES] : EECS_COURSES;
    return pool
      .filter((c) => level !== "special" || c.kind)
      .filter((c) => level !== "lower" || !isUpper(c))
      .filter((c) => level !== "upper" || isUpper(c))
      .filter((c) => !depts.length || depts.includes(dept(c)))
      .filter((c) => !area || (c.areas ?? []).includes(area))
      .filter((c) => !readyOnly || (!takenSet.has(c.code) && missingGroups(c, takenSet).length === 0))
      .filter((c) => matches(c, query))
      .sort(byCode);
  }, [query, level, depts, area, readyOnly, takenSet]);

  const filtered = query.trim() || level !== "all" || depts.length || area || readyOnly;

  return (
    <section id="explore" className="relative mx-auto -mt-24 max-w-7xl scroll-mt-4">
      {/* search + filters */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-xl shadow-berkeley/10 ring-1 ring-slate-200 dark:ring-slate-700 sm:p-6">
        <label htmlFor="search" className="sr-only">Search courses</label>
        <div className="relative">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 dark:text-slate-400" aria-hidden>🔍</span>
          <input
            ref={searchRef}
            id="search"
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") setQuery("");
              if (e.key === "Enter" && visible[0]) select(visible[0].code);
            }}
            placeholder="Search courses: CS 162, machine learning, circuits…"
            className="w-full rounded-2xl bg-slate-50 dark:bg-slate-800/60 py-3.5 pl-12 pr-14 text-base ring-1 ring-slate-200 dark:ring-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <kbd className="pointer-events-none absolute right-4 top-1/2 hidden -translate-y-1/2 rounded-md border border-slate-300 dark:border-slate-600 px-2 py-0.5 font-mono text-xs text-slate-600 dark:text-slate-400 sm:block">
            /
          </kbd>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="flex flex-wrap gap-2" role="group" aria-label="Level">
            {LEVELS.map((l) => (
              <Chip key={l.id} active={level === l.id} onClick={() => setLevel(l.id)}>{l.label}</Chip>
            ))}
          </div>
          <span className="mx-1 hidden h-6 w-px bg-slate-200 dark:bg-slate-700 sm:block" />
          <div className="flex flex-wrap gap-2" role="group" aria-label="Department">
            {DEPTS.map((d) => (
              <Chip
                key={d}
                active={depts.includes(d)}
                onClick={() => setDepts(depts.includes(d) ? depts.filter((x) => x !== d) : [...depts, d])}
              >
                {d}
              </Chip>
            ))}
          </div>
          <label htmlFor="area" className="sr-only">Related area</label>
          <select
            id="area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="max-w-full rounded-full bg-slate-100 px-3.5 py-1.5 text-sm font-medium text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-gold"
          >
            <option value="">All areas</option>
            {AREAS.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>

        {/* what you've taken */}
        <div className="mt-4 flex flex-col gap-3 rounded-2xl bg-gold/10 px-4 py-3 text-sm sm:flex-row sm:items-center sm:justify-between">
          <p className="text-slate-700 dark:text-slate-200">
            {taken.length ? (
              <><strong>{taken.length}</strong> course{taken.length === 1 ? "" : "s"} marked as taken. Courses you can take now are marked <span className="font-semibold text-emerald-700 dark:text-emerald-300">● ready</span>.</>
            ) : (
              <>✨ Mark courses you&apos;ve taken and every course shows whether you&apos;re ready for it.</>
            )}
          </p>
          <div className="flex shrink-0 flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setShowNext(!showNext)}
              aria-expanded={showNext}
              aria-controls="next"
              className="rounded-full bg-gold px-3.5 py-1.5 text-sm font-semibold text-berkeley shadow-md shadow-gold/30 transition hover:-translate-y-0.5"
            >
              📅 What can I take next term?
            </button>
            {taken.length > 0 && (
              <>
                <Chip active={readyOnly} onClick={() => setReadyOnly(!readyOnly)}>Only what I can take</Chip>
                <button type="button" onClick={clearTaken} className="rounded-full px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100">
                  Clear
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {showNext && <NextTerm taken={takenSet} onSelect={selectFromNext} onClose={() => setShowNext(false)} />}

      <div className="mt-8 grid gap-8 lg:grid-cols-[22rem_1fr]">
        {/* course list */}
        <div className="min-w-0">
          <p className="mb-3 px-1 text-sm text-slate-600 dark:text-slate-400" aria-live="polite">
            {visible.length} course{visible.length === 1 ? "" : "s"}
            {filtered ? " match" : ""}
          </p>
          <ul className="space-y-2 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto lg:pr-2">
            {visible.map((c) => (
              <CourseRow key={c.code} course={c} selected={c.code === selected} taken={takenSet} onSelect={select} />
            ))}
            {visible.length === 0 && (
              <li className="rounded-2xl bg-white dark:bg-slate-900 p-8 text-center shadow-sm ring-1 ring-slate-200 dark:ring-slate-700">
                <p className="font-semibold">No courses match</p>
                <button
                  type="button"
                  onClick={() => { setQuery(""); setLevel("all"); setDepts([]); setArea(""); setReadyOnly(false); }}
                  className="mt-4 rounded-xl bg-gold px-4 py-2 text-sm font-semibold text-berkeley shadow-lg shadow-gold/30 transition hover:-translate-y-0.5"
                >
                  Clear filters
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* details */}
        <div ref={detailRef} className="order-first min-w-0 scroll-mt-4 lg:order-none lg:sticky lg:top-4 lg:self-start">
          <CourseDetail
            key={selected}
            course={COURSES[selected]}
            taken={takenSet}
            onSelect={select}
            onToggleTaken={toggleTaken}
          />
        </div>
      </div>
    </section>
  );
}

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition ${
        active
          ? "bg-berkeley text-white shadow-md shadow-berkeley/30 dark:bg-gold dark:text-berkeley"
          : "bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      }`}
    >
      {children}
    </button>
  );
}

function Status({ course, taken }: { course: Course; taken: Set<string> }) {
  if (taken.has(course.code)) return <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">✓ taken</span>;
  if (course.kind) return <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{KIND_LABELS[course.kind]}</span>;
  if (!taken.size) return null;
  const missing = missingGroups(course, taken).length;
  return missing === 0
    ? <span className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">● ready</span>
    : <span className="text-xs text-slate-600 dark:text-slate-400">🔒 {missing} to go</span>;
}

function CourseRow({ course, selected, taken, onSelect }: {
  course: Course; selected: boolean; taken: Set<string>; onSelect: (code: string) => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={() => onSelect(course.code)}
        aria-current={selected ? "true" : undefined}
        className={`group flex w-full items-center gap-3 rounded-2xl p-3.5 text-left ring-1 transition ${
          selected
            ? "bg-berkeley text-white ring-berkeley shadow-lg shadow-berkeley/20 dark:bg-blue-950 dark:ring-gold/60"
            : "bg-white ring-slate-200 hover:-translate-y-0.5 hover:shadow-md hover:ring-gold/60 dark:bg-slate-900 dark:ring-slate-700"
        }`}
      >
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className={`font-bold ${selected ? "text-gold" : "text-berkeley dark:text-blue-300"}`}>{course.display}</span>
            {course.units && <span className={`text-xs ${selected ? "text-blue-200" : "text-slate-500 dark:text-slate-400"}`}>{course.units}u</span>}
          </span>
          <span className={`block truncate text-sm ${selected ? "text-blue-100" : "text-slate-600 dark:text-slate-400"}`}>{course.title}</span>
        </span>
        {!selected && <Status course={course} taken={taken} />}
      </button>
    </li>
  );
}

function CodeChip({ code, taken, onSelect }: { code: string; taken: Set<string>; onSelect: (code: string) => void }) {
  const c = COURSES[code];
  const done = taken.has(code);
  return (
    <button
      type="button"
      onClick={() => onSelect(code)}
      title={c.title}
      className={`rounded-lg px-2.5 py-1 text-sm font-semibold transition hover:-translate-y-0.5 ${
        done
          ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-200"
          : "bg-berkeley/10 text-berkeley hover:bg-berkeley/20 dark:bg-blue-400/15 dark:text-blue-200 dark:hover:bg-blue-400/25"
      }`}
    >
      {done && "✓ "}{c.display}
    </button>
  );
}

function Groups({ groups, taken, onSelect }: { groups: string[][]; taken: Set<string>; onSelect: (code: string) => void }) {
  return (
    <ul className="space-y-2">
      {groups.map((g, i) => (
        <li key={i} className="flex flex-wrap items-center gap-2">
          <span className={`flex h-5 w-5 items-center justify-center rounded-full text-[10px] ${
            g.some((c) => taken.has(c)) ? "bg-emerald-500 text-white" : "bg-slate-200 text-slate-600 dark:bg-slate-700 dark:text-slate-300"
          }`} aria-hidden>
            {g.some((c) => taken.has(c)) ? "✓" : i + 1}
          </span>
          {g.length > 1 && <span className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">one of</span>}
          {g.map((code, j) => (
            <span key={code} className="flex items-center gap-2">
              {j > 0 && <span className="text-xs text-slate-500 dark:text-slate-400">or</span>}
              <CodeChip code={code} taken={taken} onSelect={onSelect} />
            </span>
          ))}
        </li>
      ))}
    </ul>
  );
}

function CourseDetail({ course, taken, onSelect, onToggleTaken }: {
  course: Course; taken: Set<string>; onSelect: (code: string) => void; onToggleTaken: (code: string) => void;
}) {
  const done = taken.has(course.code);
  const missing = missingGroups(course, taken);
  const unlocks = (UNLOCKS[course.code] ?? []).map((c) => COURSES[c]).sort(byCode);

  return (
    <article className="animate-fade-up rounded-3xl bg-white dark:bg-slate-900 p-6 shadow-sm ring-1 ring-slate-200 dark:ring-slate-700 sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-widest text-gold-dark dark:text-gold">
            {course.outside ? "Outside EECS" : isUpper(course) ? "Upper division" : "Lower division"}
            {course.units && ` · ${course.units} units`}
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight text-berkeley dark:text-blue-300 sm:text-4xl">{course.display}</h2>
          <p className="mt-1 text-lg text-slate-700 dark:text-slate-300">{course.title}</p>
        </div>
        <button
          type="button"
          onClick={() => onToggleTaken(course.code)}
          aria-pressed={done}
          className={`shrink-0 rounded-xl px-4 py-2.5 text-sm font-semibold transition hover:-translate-y-0.5 ${
            done
              ? "bg-emerald-500 text-white shadow-lg shadow-emerald-500/30"
              : "bg-gold text-berkeley shadow-lg shadow-gold/30"
          }`}
        >
          {done ? "✓ Taken" : "I've taken this"}
        </button>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {(course.terms ?? []).map((t) => (
          <span key={t} className="rounded-full bg-berkeley/10 px-3 py-1 text-xs font-medium text-berkeley dark:bg-blue-400/15 dark:text-blue-200">
            {t === "Fall" ? "🍂" : t === "Spring" ? "🌸" : "☀️"} {t}
          </span>
        ))}
        {course.class_hours && (
          <span className="rounded-full bg-gold/15 px-3 py-1 text-xs font-medium text-gold-dark dark:text-gold">
            ⏱ {course.class_hours} hrs/week in class
          </span>
        )}
        {(course.areas ?? []).map((a) => (
          <span key={a} className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">{a}</span>
        ))}
      </div>

      {/* seminars, DeCals, special topics: the requirements depend on the topic */}
      {course.kind && (
        <p className="mt-5 rounded-2xl bg-berkeley/5 px-4 py-3 text-sm text-slate-700 ring-1 ring-berkeley/15 dark:bg-blue-400/10 dark:text-slate-200 dark:ring-blue-400/20">
          ℹ️ {course.note}
        </p>
      )}
      {course.kind === "decal" && <DecalList />}

      {/* readiness */}
      {!done && !course.kind && taken.size > 0 && (
        <p className={`mt-5 rounded-2xl px-4 py-3 text-sm font-medium ${
          missing.length === 0
            ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:ring-emerald-800"
            : "bg-amber-50 text-amber-800 ring-1 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:ring-amber-800"
        }`}>
          {missing.length === 0
            ? "🎉 You've met the prerequisites for this course."
            : `🔒 Still need ${missing.length} more requirement${missing.length === 1 ? "" : "s"}: ${missing.map((g) => g.map((c) => COURSES[c].display).join(" or ")).join("; ")}.`}
        </p>
      )}

      {course.description && <p className="mt-5 text-slate-600 dark:text-slate-400">{course.description}</p>}

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Needs first</h3>
          <div className="mt-3">
            {course.prereqs.length
              ? <Groups groups={course.prereqs} taken={taken} onSelect={onSelect} />
              : <p className="text-sm text-slate-600 dark:text-slate-400">No course prerequisites.</p>}
          </div>
          {course.coreqs.length > 0 && (
            <>
              <h3 className="mt-6 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Before or alongside</h3>
              <div className="mt-3"><Groups groups={course.coreqs} taken={taken} onSelect={onSelect} /></div>
            </>
          )}
        </div>
        <div>
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
            Unlocks {unlocks.length > 0 && <span className="text-gold-dark dark:text-gold">{unlocks.length}</span>}
          </h3>
          <div className="mt-3 flex flex-wrap gap-2">
            {unlocks.length
              ? unlocks.map((c) => <CodeChip key={c.code} code={c.code} taken={taken} onSelect={onSelect} />)
              : <p className="text-sm text-slate-600 dark:text-slate-400">No courses here list it as a prerequisite.</p>}
          </div>
        </div>
      </div>

      <h3 className="mt-10 text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Full prerequisite chain</h3>
      <div className="mt-3">
        <ChainDiagram code={course.code} taken={taken} onSelect={onSelect} />
      </div>

      <div className="mt-8 rounded-2xl border-l-4 border-gold bg-slate-50 dark:bg-slate-800/60 p-4">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">Official prerequisites</p>
        <p className="mt-1 text-sm text-slate-700 dark:text-slate-300">{course.prereq_text || "None listed."}</p>
        {course.note && !course.kind && <p className="mt-2 text-xs text-amber-800 dark:text-amber-200">⚠️ {course.note}</p>}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          {[
            { href: course.outside ? course.source : course.catalog_source, label: "Berkeley catalog ↗" },
            { href: course.outside ? null : course.source, label: "EECS course page ↗" },
          ].filter((l) => l.href).map((l) => (
            <a key={l.label} href={l.href!} target="_blank" rel="noopener noreferrer" className="text-sm font-semibold text-berkeley-light hover:text-gold-dark dark:text-blue-300 dark:hover:text-gold">
              {l.label}
            </a>
          ))}
        </div>
      </div>
    </article>
  );
}

// this semester's EECS DeCals (student-run courses taken as CS or EE 98/198), from berkeleydecal.com
function DecalList() {
  if (!DECALS?.courses.length) {
    return (
      <p className="mt-5 text-sm text-slate-600 dark:text-slate-400">
        Browse this semester&apos;s DeCals at{" "}
        <a href="https://berkeleydecal.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-berkeley-light underline dark:text-blue-300">berkeleydecal.com ↗</a>.
      </p>
    );
  }
  return (
    <div className="mt-6">
      <h3 className="text-sm font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400">
        EECS DeCals, {DECALS.semester} <span className="text-gold-dark dark:text-gold">{DECALS.courses.length}</span>
      </h3>
      <ul className="mt-3 grid gap-3 sm:grid-cols-2">
        {DECALS.courses.map((d) => (
          <li key={d.title} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 dark:bg-slate-800/60 dark:ring-slate-700">
            <p className="font-semibold text-berkeley dark:text-blue-300">
              {d.title} {d.units && <span className="text-xs font-normal text-slate-600 dark:text-slate-400">· {d.units} unit{d.units === "1" ? "" : "s"}</span>}
            </p>
            <p className="mt-1 line-clamp-3 text-sm text-slate-600 dark:text-slate-400">{d.description}</p>
            {(d.website || d.apply) && (
              <p className="mt-2 flex flex-wrap gap-x-4 text-sm">
                {d.website && <a href={d.website} target="_blank" rel="noopener noreferrer" className="font-semibold text-berkeley-light hover:text-gold-dark dark:text-blue-300 dark:hover:text-gold">Website ↗</a>}
                {d.apply && <a href={d.apply} target="_blank" rel="noopener noreferrer" className="font-semibold text-berkeley-light hover:text-gold-dark dark:text-blue-300 dark:hover:text-gold">Apply ↗</a>}
              </p>
            )}
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs text-slate-600 dark:text-slate-400">
        From the{" "}
        <a href="https://berkeleydecal.com" target="_blank" rel="noopener noreferrer" className="font-semibold text-berkeley-light underline dark:text-blue-300">DeCal program</a>,
        which has every department&apos;s DeCals, times and enrollment steps.
      </p>
    </div>
  );
}
