export interface AppModule {
  id: string;
  title: string;
  href: string;
  available: boolean;
}

export const APP_MODULES: AppModule[] = [
  { id: "evaluation", title: "Evaluations", href: "/evaluation", available: true },
  { id: "datasets", title: "Datasets", href: "/dataset", available: true },
  { id: "dashboard", title: "Dashboard", href: "/dashboard", available: true },
  { id: "history", title: "History", href: "/history", available: true },
  { id: "reviews", title: "My reviews", href: "/reviews", available: true },
];

export const APP_TITLE = "HeatWave";
