"use client";

import { useState, type KeyboardEvent } from "react";
import { Input } from "@/components/ui/Input";

type Props = {
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
};

/** Free-text chip input: type a value and press Enter (or comma) to add it. */
export function TagInput({ value, onChange, placeholder }: Props) {
  const [draft, setDraft] = useState("");

  function addTag() {
    const tag = draft.trim();
    if (tag && !value.includes(tag.toLowerCase())) {
      onChange([...value, tag.toLowerCase()]);
    }
    setDraft("");
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    } else if (e.key === "Backspace" && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  }

  return (
    <div>
      <Input
        value={draft}
        placeholder={placeholder}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={addTag}
      />
      {value.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {value.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full bg-sage-light px-3 py-1 text-xs text-sage"
            >
              {tag}
              <button
                type="button"
                className="cursor-pointer text-sage/70 hover:text-sage"
                onClick={() => onChange(value.filter((t) => t !== tag))}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
