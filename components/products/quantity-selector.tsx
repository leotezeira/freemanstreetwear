"use client";

type QuantitySelectorProps = {
  value: number;
  max: number;
  onChange: (value: number) => void;
};

export function QuantitySelector({ value, max, onChange }: QuantitySelectorProps) {
  return (
    <div className="flex items-center border border-slate-300">
      <button
        type="button"
        className="h-11 w-11 text-lg"
        onClick={() => onChange(Math.max(1, value - 1))}
        aria-label="Reducir cantidad"
      >
        −
      </button>
      <span className="w-12 text-center text-sm font-semibold">{value}</span>
      <button
        type="button"
        className="h-11 w-11 text-lg"
        onClick={() => onChange(Math.min(max, value + 1))}
        aria-label="Aumentar cantidad"
      >
        +
      </button>
    </div>
  );
}
