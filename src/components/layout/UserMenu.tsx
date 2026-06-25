"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  User as UserIcon,
  Settings as SettingsIcon,
  UserCog,
  LogOut,
  BarChart3,
} from "lucide-react";
import { AccountModal } from "@/components/account/AccountModal";
import { SettingsModal } from "@/components/settings/SettingsModal";
import { loadProfile, type UserProfile } from "@/lib/settings";
import { logout } from "@/lib/auth";

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [showAccount, setShowAccount] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    setProfile(loadProfile());
  }, []);

  function handleLogout() {
    logout();
    setOpen(false);
    router.push("/login");
  }

  return (
    <>
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-slate-200 bg-teal-50 hover:border-teal-300"
          aria-label="User menu"
        >
          {profile?.photo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.photo}
              alt="Profile"
              className="h-full w-full object-cover"
            />
          ) : (
            <UserIcon className="h-5 w-5 text-teal-600" />
          )}
        </button>

        {open && (
          <>
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setOpen(false)}
              className="fixed inset-0 z-40 cursor-default"
            />
            <div className="absolute right-0 z-50 mt-2 w-60 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
              <div className="border-b border-slate-100 px-4 py-3">
                <p className="truncate text-sm font-semibold text-slate-900">
                  {profile?.name || "User"}
                </p>
                <p className="truncate text-xs text-slate-500">
                  {profile?.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowAccount(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <UserCog className="h-4 w-4 text-slate-400" />
                Account
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  router.push("/statistics");
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <BarChart3 className="h-4 w-4 text-slate-400" />
                Statistics
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setShowSettings(true);
                }}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50"
              >
                <SettingsIcon className="h-4 w-4 text-slate-400" />
                Settings
              </button>
              <div className="my-1 border-t border-slate-100" />
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-sm text-coral-600 hover:bg-coral-50"
              >
                <LogOut className="h-4 w-4" />
                Logout
              </button>
            </div>
          </>
        )}
      </div>

      {showAccount && (
        <AccountModal
          onClose={() => setShowAccount(false)}
          onSaved={(p) => setProfile(p)}
        />
      )}
      {showSettings && <SettingsModal onClose={() => setShowSettings(false)} />}
    </>
  );
}
