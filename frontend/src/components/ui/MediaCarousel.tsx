"use client";

import { useState } from "react";
import { apiUrl } from "@/lib/api";
import type { RecipeMedia } from "@/lib/types";

export function MediaCarousel({ media, alt }: { media: RecipeMedia[]; alt: string }) {
  const [index, setIndex] = useState(0);

  if (media.length === 0) return null;

  function go(delta: number) {
    setIndex((i) => (i + delta + media.length) % media.length);
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="relative aspect-video w-full overflow-hidden rounded-xl bg-ink/5 sm:aspect-[16/9]">
        <div
          className="flex h-full w-full transition-transform duration-500 ease-out"
          style={{ transform: `translateX(-${index * 100}%)` }}
        >
          {media.map((m) => (
            <div key={m.id} className="h-full w-full shrink-0 basis-full">
              {m.type === "VIDEO" ? (
                <video controls className="h-full w-full object-cover">
                  <source src={apiUrl(m.url)} />
                </video>
              ) : (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={apiUrl(m.url)} alt={alt} className="h-full w-full object-cover" />
              )}
            </div>
          ))}
        </div>

        {media.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(-1)}
              aria-label="Previous"
              className="absolute left-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="15 18 9 12 15 6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => go(1)}
              aria-label="Next"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-full bg-black/50 p-2 text-white hover:bg-black/70"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="9 18 15 12 9 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {media.length > 1 && (
        <div className="flex items-center justify-center gap-1.5">
          {media.map((m, i) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setIndex(i)}
              aria-label={`Go to slide ${i + 1}`}
              className={`h-2 w-2 rounded-full transition-colors ${i === index ? "bg-terracotta-dark" : "bg-ink/20"}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
