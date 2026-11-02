// the four sites link to each other; locally they run on ports 3000, 3002, 3003 and 3001
const dev = process.env.NODE_ENV === "development";

export const SUITE = [
  { id: "planner", label: "Planner", icon: "🗺️", url: process.env.NEXT_PUBLIC_PLANNER_URL ?? (dev ? "http://localhost:3000" : "https://eecs-planner.vercel.app") },
  { id: "prereqs", label: "Prereqs", icon: "🧭", url: process.env.NEXT_PUBLIC_PREREQS_URL ?? (dev ? "http://localhost:3002" : "https://eecs-prereqs.vercel.app") },
  { id: "electives", label: "Electives", icon: "🎯", url: process.env.NEXT_PUBLIC_ELECTIVES_URL ?? (dev ? "http://localhost:3003" : "https://eecs-electives.vercel.app") },
  { id: "links", label: "Links", icon: "🔗", url: process.env.NEXT_PUBLIC_LINKS_URL ?? (dev ? "http://localhost:3001" : "https://eecs-links.vercel.app") },
] as const;

export type SiteId = (typeof SUITE)[number]["id"];

export const siteUrl = (id: SiteId) => SUITE.find((s) => s.id === id)!.url;
