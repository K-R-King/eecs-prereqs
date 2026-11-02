// courses you've marked as taken are kept in the browser
const STORAGE_KEY = "eecs-prereqs:taken";

export function loadTaken(): string[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? parsed.filter((c) => typeof c === "string") : [];
  } catch {
    return [];
  }
}

export function saveTaken(codes: string[]) {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));
  } catch {
    // storage full or blocked (e.g. private browsing); marks just won't persist
  }
}
