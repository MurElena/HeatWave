import { loadProfile, saveProfile } from "@/lib/settings";

const AUTH_KEY = "trans-eval-auth";
export const AUTH_CHANGED_EVENT = "trans-eval-auth-changed";

interface AuthState {
  email: string;
  name: string;
}

function emitChange(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
  }
}

export function getAuth(): AuthState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    return raw ? (JSON.parse(raw) as AuthState) : null;
  } catch {
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getAuth() !== null;
}

export function login(email: string, name?: string): void {
  const state: AuthState = { email, name: name ?? email.split("@")[0] };
  localStorage.setItem(AUTH_KEY, JSON.stringify(state));

  const profile = loadProfile();
  saveProfile({
    ...profile,
    email,
    name: name?.trim() || profile.name || email.split("@")[0],
  });
  emitChange();
}

export function register(name: string, email: string): void {
  login(email, name);
}

export function logout(): void {
  localStorage.removeItem(AUTH_KEY);
  emitChange();
}
