import type { PriorityCard } from "@/lib/types";

export const PRIORITY_CARDS: PriorityCard[] = [
  {
    id: "long",
    name: "Long segments",
    description: "Sentences of 50+ words — dense paragraphs and complex clauses.",
    color: "#7c6fd6",
  },
  {
    id: "short",
    name: "Short segments",
    description: "5 words or fewer — UI labels, buttons, menu items.",
    color: "#00BBA7",
  },
  {
    id: "placeholders",
    name: "Placeholders",
    description: "Variables like {name}, %s, {{count}} that must stay intact.",
    color: "#FE6C5E",
  },
  {
    id: "markup",
    name: "Markup",
    description: "Inline tags and entities such as <b>, <a>, &amp;.",
    color: "#d65a9c",
  },
  {
    id: "numbers",
    name: "Numbers",
    description: "Figures, dates, prices, measurements and IDs.",
    color: "#f59e0b",
  },
  {
    id: "glossary",
    name: "Glossary terms",
    description: "Segments that use your uploaded glossary terminology.",
    color: "#3b82f6",
    requiresGlossary: true,
  },
  {
    id: "html-non-utf8",
    name: "HTML / non-UTF-8",
    description: "HTML blocks and accented or special characters (é, ü, ©).",
    color: "#06b6d4",
  },
  {
    id: "consistency",
    name: "Consistency",
    description: "Repeated strings duplicated to test consistent output.",
    color: "#84cc16",
  },
];
