import { COURSES } from "@/lib/courses";

const NODE_W = 136;
const NODE_H = 46;
const COL_GAP = 60;
const ROW_GAP = 14;

type Edge = { from: string; to: string; kind: "required" | "oneOf" | "together" };

// The course, everything it needs (recursively), and how far back each one sits. The course's own
// "one of these" requirements show every option; further back, only the option you've taken (or
// else the usual one, which official text lists first) is drawn, so the chain stays readable.
function layout(code: string, taken: Set<string>) {
  const depth: Record<string, number> = { [code]: 0 };
  const edges: Edge[] = [];
  const queue = [code];
  const seen = new Set<string>();
  while (queue.length) {
    const current = queue.shift()!;
    if (seen.has(current)) continue;
    seen.add(current);
    const c = COURSES[current];
    const shown = (g: string[]) => (current === code ? g : [g.find((x) => taken.has(x)) ?? g[0]]);
    const groups = [
      ...c.prereqs.map((g) => ({ g: shown(g), kind: g.length > 1 && current === code ? "oneOf" : "required" }) as const),
      ...c.coreqs.map((g) => ({ g: shown(g), kind: "together" }) as const),
    ];
    for (const { g, kind } of groups) {
      for (const from of g) {
        edges.push({ from, to: current, kind });
        queue.push(from);
      }
    }
  }
  // longest path back to the course, so every arrow points right
  const nodes = [...seen];
  for (let i = 0; i < nodes.length; i++) {
    for (const e of edges) depth[e.from] = Math.max(depth[e.from] ?? 0, (depth[e.to] ?? 0) + 1);
  }
  const maxDepth = Math.max(...nodes.map((n) => depth[n]));

  // fill columns right to left, ordering each by where its dependents sit to cut down crossings
  const columns: string[][] = Array.from({ length: maxDepth + 1 }, () => []);
  const row: Record<string, number> = {};
  for (let d = 0; d <= maxDepth; d++) {
    const col = nodes.filter((n) => depth[n] === d);
    const weight = (n: string) => {
      const rows = edges.filter((e) => e.from === n && row[e.to] !== undefined).map((e) => row[e.to]);
      return rows.length ? rows.reduce((a, b) => a + b, 0) / rows.length : 0;
    };
    col.sort((a, b) => weight(a) - weight(b) || a.localeCompare(b));
    col.forEach((n, i) => (row[n] = i - (col.length - 1) / 2));
    columns[maxDepth - d] = col;
  }

  const tallest = Math.max(...columns.map((c) => c.length));
  const height = tallest * NODE_H + (tallest - 1) * ROW_GAP;
  const pos: Record<string, { x: number; y: number }> = {};
  columns.forEach((col, ci) =>
    col.forEach((n) => {
      pos[n] = { x: ci * (NODE_W + COL_GAP), y: height / 2 + row[n] * (NODE_H + ROW_GAP) - NODE_H / 2 };
    }),
  );
  return { pos, edges, width: columns.length * NODE_W + (columns.length - 1) * COL_GAP, height };
}

export default function ChainDiagram({
  code,
  taken,
  onSelect,
}: {
  code: string;
  taken: Set<string>;
  onSelect: (code: string) => void;
}) {
  const { pos, edges, width, height } = layout(code, taken);

  if (Object.keys(pos).length === 1) {
    return (
      <p className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-5 text-sm text-slate-600 dark:text-slate-400 ring-1 ring-slate-200 dark:ring-slate-700">
        No course prerequisites, so there&apos;s no chain to show. A great place to start.
      </p>
    );
  }

  return (
    <div>
      <div className="overflow-x-auto rounded-2xl bg-slate-50 dark:bg-slate-800/40 p-5 ring-1 ring-slate-200 dark:ring-slate-700">
        <div className="relative mx-auto" style={{ width, height }}>
          <svg className="absolute inset-0 overflow-visible" width={width} height={height} aria-hidden>
            {edges.map((e, i) => {
              const a = pos[e.from];
              const b = pos[e.to];
              const x1 = a.x + NODE_W;
              const y1 = a.y + NODE_H / 2;
              const x2 = b.x;
              const y2 = b.y + NODE_H / 2;
              const mid = (x1 + x2) / 2;
              const intoCourse = e.to === code;
              return (
                <path
                  key={i}
                  d={`M${x1},${y1} C${mid},${y1} ${mid},${y2} ${x2},${y2}`}
                  fill="none"
                  strokeWidth={intoCourse ? 2.5 : 1.5}
                  strokeDasharray={e.kind === "oneOf" ? "6 5" : e.kind === "together" ? "2 4" : undefined}
                  strokeLinecap="round"
                  className={intoCourse ? "stroke-gold" : "stroke-slate-300 dark:stroke-slate-600"}
                />
              );
            })}
          </svg>

          {Object.entries(pos).map(([n, p]) => {
            const c = COURSES[n];
            const selected = n === code;
            const done = taken.has(n);
            return (
              <button
                key={n}
                type="button"
                onClick={() => onSelect(n)}
                title={`${c.display}: ${c.title}`}
                className={`absolute flex flex-col justify-center rounded-xl px-3 text-left transition hover:-translate-y-0.5 hover:shadow-md ${
                  selected
                    ? "bg-gold text-berkeley shadow-lg shadow-gold/30"
                    : done
                      ? "bg-emerald-50 text-emerald-900 ring-2 ring-emerald-400 dark:bg-emerald-950/60 dark:text-emerald-100"
                      : c.outside
                        ? "border border-dashed border-slate-300 bg-white text-slate-700 dark:border-slate-600 dark:bg-slate-900 dark:text-slate-300"
                        : "bg-white text-slate-900 ring-1 ring-slate-200 dark:bg-slate-900 dark:text-slate-100 dark:ring-slate-700"
                }`}
                style={{ left: p.x, top: p.y, width: NODE_W, height: NODE_H }}
              >
                <span className="flex items-center gap-1 text-xs font-bold">
                  {done && !selected && <span aria-label="taken">✓</span>}
                  {c.display}
                </span>
                <span className={`truncate text-[10px] ${selected ? "text-berkeley/80" : "text-slate-600 dark:text-slate-400"}`}>{c.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1 text-xs text-slate-600 dark:text-slate-400">
        <Legend dash={undefined} label="required" />
        <Legend dash="6 5" label="one of these" />
        <Legend dash="2 4" label="before or alongside" />
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded border border-dashed border-slate-400" />outside EECS</span>
        <span className="flex items-center gap-1.5"><span className="h-3 w-3 rounded ring-2 ring-emerald-400" />taken</span>
      </div>
    </div>
  );
}

function Legend({ dash, label }: { dash?: string; label: string }) {
  return (
    <span className="flex items-center gap-1.5">
      <svg width="24" height="6" aria-hidden>
        <line x1="1" y1="3" x2="23" y2="3" strokeWidth="2" strokeLinecap="round" strokeDasharray={dash} className="stroke-slate-400" />
      </svg>
      {label}
    </span>
  );
}
