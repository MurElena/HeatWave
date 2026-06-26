"use client";

import { useEffect, useMemo, useState } from "react";
import { ClipboardCheck } from "lucide-react";
import { ReviewCard } from "@/components/reviews/ReviewCard";
import { ReviewEditor } from "@/components/reviews/ReviewEditor";
import { ensureDemoReviews } from "@/lib/demo/seed-reviews";
import { loadProfile } from "@/lib/settings";
import { loadReviews } from "@/lib/storage/reviews";
import type { Review } from "@/lib/types";

export function ReviewsModule() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [mounted, setMounted] = useState(false);
  const [active, setActive] = useState<Review | null>(null);

  const me = useMemo(() => loadProfile().name || "Myself", []);

  function refresh() {
    const mine = loadReviews().filter(
      (r) => r.assignedTo === me || r.assignedTo === "Myself",
    );
    setReviews(mine);
  }

  useEffect(() => {
    setMounted(true);
    ensureDemoReviews();
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  const pending = reviews.filter((r) => r.status === "pending");
  const completed = reviews.filter((r) => r.status === "done");

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">My reviews</h1>
        <p className="mt-1 text-slate-600">
          Human reviews assigned to you. Pending reviews are highlighted in amber, completed ones in
          green.
        </p>
      </div>

      {reviews.length === 0 ? (
        <div className="mt-6 rounded-2xl border-2 border-dashed border-slate-200 bg-white px-8 py-16 text-center">
          <ClipboardCheck className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-lg font-medium text-slate-700">No reviews assigned</h3>
          <p className="mt-1 text-sm text-slate-500">
            Send an evaluation result for human review to see it here.
          </p>
        </div>
      ) : (
        <div className="mt-6 space-y-8">
          {pending.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-amber-700">
                Pending ({pending.length})
              </h2>
              <div className="space-y-4">
                {pending.map((review) => (
                  <ReviewCard key={review.id} review={review} onOpen={setActive} />
                ))}
              </div>
            </section>
          )}

          {completed.length > 0 && (
            <section>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-green-700">
                Completed ({completed.length})
              </h2>
              <div className="space-y-4">
                {completed.map((review) => (
                  <ReviewCard key={review.id} review={review} onOpen={setActive} />
                ))}
              </div>
            </section>
          )}
        </div>
      )}

      {active && (
        <ReviewEditor
          review={active}
          onClose={() => setActive(null)}
          onFinished={() => {
            setActive(null);
            refresh();
          }}
        />
      )}
    </div>
  );
}
