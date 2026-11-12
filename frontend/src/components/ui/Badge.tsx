import clsx from "clsx";
import type { ReactNode } from "react";

type Tone = "terracotta" | "sage" | "berry" | "neutral";

const TONE_CLASSES: Record<Tone, string> = {
  terracotta: "bg-terracotta-light text-terracotta-dark",
  sage: "bg-sage-light text-sage",
  berry: "bg-berry-light text-berry",
  neutral: "bg-ink/5 text-ink-soft",
};

export function Badge({ tone = "neutral", children }: { tone?: Tone; children: ReactNode }) {
  return (
    <span className={clsx("inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium", TONE_CLASSES[tone])}>
      {children}
    </span>
  );
}
