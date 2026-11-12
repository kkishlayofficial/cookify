"use client";

import { useState } from "react";
import clsx from "clsx";

type Props = {
  value: number;
  onChange?: (value: number) => void;
  readOnly?: boolean;
  size?: "sm" | "md" | "lg";
};

const SIZE_CLASSES = { sm: "text-sm", md: "text-lg", lg: "text-2xl" };

/** Interactive 1-5 star rating widget; read-only mode just renders the value. */
export function StarRating({ value, onChange, readOnly, size = "md" }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className={clsx("inline-flex gap-0.5", SIZE_CLASSES[size])} role={readOnly ? undefined : "radiogroup"}>
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          aria-label={`${star} star${star > 1 ? "s" : ""}`}
          className={clsx(
            "leading-none",
            readOnly ? "cursor-default" : "cursor-pointer",
            star <= display ? "text-peach" : "text-ink/15",
          )}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(null)}
          onClick={() => !readOnly && onChange?.(star)}
        >
          ★
        </button>
      ))}
    </div>
  );
}
