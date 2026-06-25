"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { APP_MODULES, APP_TITLE } from "@/lib/constants/modules";
import { countPendingReviews, REVIEWS_CHANGED_EVENT } from "@/lib/storage/reviews";
import { Logo } from "./Logo";
import { UserMenu } from "./UserMenu";

export function TopNav() {
  const pathname = usePathname();
  const [pendingReviews, setPendingReviews] = useState(0);

  useEffect(() => {
    const refresh = () => setPendingReviews(countPendingReviews());
    refresh();
    window.addEventListener(REVIEWS_CHANGED_EVENT, refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener(REVIEWS_CHANGED_EVENT, refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  if (pathname === "/login") return null;

  return (
    <header className="sticky top-0 z-50 border-b border-teal-100 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <Logo />
          <div>
            <p className="text-lg font-semibold tracking-tight text-slate-900">
              {APP_TITLE}
            </p>
            <p className="hidden text-xs text-slate-500 sm:block">
              Translation Model Evaluation
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-2">
          <nav className="flex items-center gap-1">
            {APP_MODULES.map((module) => {
              const isActive = pathname.startsWith(module.href);
              const baseClass =
                "rounded-lg px-3 py-2 text-sm font-medium transition-colors";

              if (!module.available) {
                return (
                  <span
                    key={module.id}
                    className={`${baseClass} cursor-not-allowed text-slate-300`}
                    title="Coming soon"
                  >
                    {module.title}
                  </span>
                );
              }

              const showDot = module.id === "reviews" && pendingReviews > 0;

              return (
                <Link
                  key={module.id}
                  href={module.href}
                  className={`relative ${baseClass} ${
                    isActive
                      ? "bg-teal-50 text-teal-700"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                  }`}
                >
                  {module.title}
                  {showDot && (
                    <span
                      className="absolute right-1 top-1 h-2 w-2 rounded-full bg-red-500"
                      aria-label={`${pendingReviews} pending reviews`}
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="ml-1 h-6 w-px bg-slate-200" />
          <UserMenu />
        </div>
      </div>
    </header>
  );
}
