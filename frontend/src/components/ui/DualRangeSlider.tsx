"use client";

type Props = {
  min: number;
  max: number;
  step?: number;
  value: [number, number];
  onChange: (next: [number, number]) => void;
  formatValue?: (n: number) => string;
};

/**
 * A lightweight dual-thumb range slider built from two overlapping native
 * `<input type="range">` elements sharing one track - no extra dependency,
 * fully keyboard accessible, good enough fidelity for filter sliders.
 */
export function DualRangeSlider({ min, max, step = 1, value, onChange, formatValue }: Props) {
  const [low, high] = value;
  const format = formatValue ?? ((n: number) => String(n));

  return (
    <div>
      <div className="relative h-6">
        <div className="absolute top-1/2 h-1.5 w-full -translate-y-1/2 rounded-full bg-ink/10" />
        <div
          className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-terracotta"
          style={{
            left: `${((low - min) / (max - min)) * 100}%`,
            right: `${100 - ((high - min) / (max - min)) * 100}%`,
          }}
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={low}
          onChange={(e) => onChange([Math.min(Number(e.target.value), high), high])}
          className="range-thumb pointer-events-none absolute w-full appearance-none bg-transparent"
        />
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={high}
          onChange={(e) => onChange([low, Math.max(Number(e.target.value), low)])}
          className="range-thumb pointer-events-none absolute w-full appearance-none bg-transparent"
        />
      </div>
      <div className="mt-1 flex justify-between text-xs text-ink-soft">
        <span>{format(low)}</span>
        <span>{format(high)}</span>
      </div>
    </div>
  );
}
