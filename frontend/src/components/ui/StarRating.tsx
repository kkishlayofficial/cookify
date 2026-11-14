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

/** Interactive half-to-full star rating widget (0.5 increments, 0.5-5); read-only mode just renders the value. */
export function StarRating({ value, onChange, readOnly, size = "md" }: Props) {
  const [hover, setHover] = useState<number | null>(null);
  const display = hover ?? value;

  return (
    <div className={clsx("inline-flex gap-0.5", SIZE_CLASSES[size])} role={readOnly ? undefined : "radiogroup"}>
      {[1, 2, 3, 4, 5].map((star) => {
        const fillFraction = Math.min(Math.max(display - (star - 1), 0), 1);
        return (
          <div key={star} className="relative inline-block leading-none">
            <span className="text-ink/15">★</span>
            <span
              className="absolute inset-0 top-0 left-0 overflow-hidden text-peach"
              style={{ width: `${fillFraction * 100}%` }}
            >
              ★
            </span>
            {!readOnly && (
              <>
                <button
                  type="button"
                  aria-label={`${star - 0.5} stars`}
                  className="absolute inset-y-0 left-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(star - 0.5)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(star - 0.5)}
                />
                <button
                  type="button"
                  aria-label={`${star} stars`}
                  className="absolute inset-y-0 right-0 w-1/2 cursor-pointer"
                  onMouseEnter={() => setHover(star)}
                  onMouseLeave={() => setHover(null)}
                  onClick={() => onChange?.(star)}
                />
              </>
            )}
          </div>
        );
      })}
    </div>
  );
}
