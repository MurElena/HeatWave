import Link from "next/link";
import { Database, BarChart3, History, ClipboardCheck, LineChart } from "lucide-react";

const modules = [
  {
    title: "Challenge Datasets",
    description:
      "Create challenge datasets from TMX or bilingual XLSX with priority-based extraction.",
    href: "/dataset",
    icon: Database,
    available: true,
    color: "teal",
  },
  {
    title: "Evaluations",
    description: "Run translation models against your challenge datasets.",
    href: "/evaluation",
    icon: BarChart3,
    available: true,
    color: "coral",
  },
  {
    title: "Dashboard",
    description: "Track winners, scores, consistency, and inference time over time.",
    href: "/dashboard",
    icon: LineChart,
    available: true,
    color: "teal",
  },
  {
    title: "History",
    description: "Browse past evaluations with winners, metrics, and graphs.",
    href: "/history",
    icon: History,
    available: true,
    color: "coral",
  },
  {
    title: "My reviews",
    description: "Complete human reviews assigned to you and refine scores.",
    href: "/reviews",
    icon: ClipboardCheck,
    available: true,
    color: "coral",
  },
];

export default function HomePage() {
  return (
    <div className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6">
      <div className="text-center">
        <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
          Welcome to HeatWave
        </h1>
        <p className="mx-auto mt-3 max-w-2xl text-lg text-slate-600">
          Build challenge datasets, evaluate translation models, and compare
          results — all in one modular platform.
        </p>
      </div>

      <div className="mt-12 grid gap-6 sm:grid-cols-2">
        {modules.map((mod) => {
          const Icon = mod.icon;
          const content = (
            <div
              className={`group relative overflow-hidden rounded-2xl border bg-white p-6 shadow-sm transition-all ${
                mod.available
                  ? "border-teal-100 hover:border-teal-300 hover:shadow-md"
                  : "border-slate-100 opacity-60"
              }`}
            >
              <div
                className={`inline-flex rounded-xl p-3 ${
                  mod.color === "teal" ? "bg-teal-50" : "bg-coral-50"
                }`}
              >
                <Icon
                  className={`h-6 w-6 ${
                    mod.color === "teal" ? "text-teal-600" : "text-coral-600"
                  }`}
                />
              </div>
              <h2 className="mt-4 text-xl font-semibold text-slate-900">
                {mod.title}
              </h2>
              <p className="mt-2 text-sm text-slate-600">{mod.description}</p>
              {!mod.available && (
                <span className="mt-3 inline-block rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-500">
                  Coming soon
                </span>
              )}
              {mod.available && (
                <span className="mt-3 inline-block text-sm font-medium text-teal-600 group-hover:text-teal-700">
                  Open module →
                </span>
              )}
            </div>
          );

          return mod.available ? (
            <Link key={mod.title} href={mod.href}>
              {content}
            </Link>
          ) : (
            <div key={mod.title}>{content}</div>
          );
        })}
      </div>
    </div>
  );
}
