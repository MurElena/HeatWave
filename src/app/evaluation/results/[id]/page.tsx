"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ResultsView } from "@/components/evaluation/ResultsView";
import { getEvaluationRun } from "@/lib/storage/evaluations";
import type { EvaluationRun } from "@/lib/types";

export default function EvaluationResultsPage() {
  const params = useParams<{ id: string }>();
  const [run, setRun] = useState<EvaluationRun | null>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (params.id) {
      setRun(getEvaluationRun(params.id) ?? null);
    }
  }, [params.id]);

  if (!mounted) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-teal-500 border-t-transparent" />
      </div>
    );
  }

  if (!run) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="text-xl font-semibold text-slate-900">Evaluation not found</h1>
        <Link href="/evaluation" className="mt-4 inline-block text-teal-700 hover:text-teal-800">
          Back to evaluation
        </Link>
      </div>
    );
  }

  return <ResultsView run={run} />;
}
