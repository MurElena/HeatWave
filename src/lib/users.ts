import { loadProfile } from "@/lib/settings";

export interface AppUser {
  id: string;
  name: string;
  email: string;
  /** Language pairs the user can review, e.g. "EN→DE". */
  workLanguagePairs: string[];
}

const USERS_KEY = "trans-eval-users";

const DEFAULT_USERS: AppUser[] = [
  {
    id: "marie",
    name: "Marie Dubois",
    email: "marie.dubois@example.com",
    workLanguagePairs: ["EN→FR", "FR→EN", "EN→IT"],
  },
  {
    id: "hans",
    name: "Hans Müller",
    email: "hans.muller@example.com",
    workLanguagePairs: ["EN→DE", "DE→EN"],
  },
  {
    id: "sofia",
    name: "Sofia Rossi",
    email: "sofia.rossi@example.com",
    workLanguagePairs: ["EN→IT", "IT→EN", "EN→ES"],
  },
];

function read<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadUsers(): AppUser[] {
  return read(USERS_KEY, DEFAULT_USERS);
}

export function saveUsers(users: AppUser[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

export function languagePairKey(source: string, target: string): string {
  return `${source}→${target}`;
}

/**
 * Returns the users (including the current profile as "myself") who can be
 * assigned a review for the given language pair.
 */
export function assignableUsersForPair(
  source: string,
  target: string,
): { id: string; name: string; isSelf: boolean }[] {
  const pair = languagePairKey(source, target);
  const profile = loadProfile();
  const out: { id: string; name: string; isSelf: boolean }[] = [];

  if ((profile.workLanguagePairs ?? []).includes(pair)) {
    out.push({ id: "__self__", name: profile.name || "Myself", isSelf: true });
  }

  for (const u of loadUsers()) {
    if (u.workLanguagePairs.includes(pair)) {
      out.push({ id: u.id, name: u.name, isSelf: false });
    }
  }

  return out;
}
