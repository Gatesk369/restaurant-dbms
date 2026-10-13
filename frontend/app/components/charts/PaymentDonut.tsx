import { donutGradient, type Slice, compactUgx } from "~/lib/domain/reports";
import { formatUgx } from "~/lib/money";

interface PaymentDonutProps {
  slices: readonly Slice[];
  total: number;
}

/** A CSS conic-gradient ring with its legend; every slice is labelled. */
export function PaymentDonut({ slices, total }: PaymentDonutProps) {
  const label = `Donut chart of payment methods: ${slices
    .map((s) => `${s.name} ${s.percent} percent`)
    .join(", ")}`;

  return (
    <div className="flex flex-wrap items-center gap-6">
      <div
        role="img"
        aria-label={label}
        className="relative size-44 flex-none rounded-full"
        style={{ background: donutGradient(slices) }}
      >
        <div className="absolute inset-9 flex flex-col items-center justify-center rounded-full bg-page text-center">
          <span className="text-label tracking-caption text-moss">Total</span>
          <span className="text-heading font-bold tabular-nums">UGX {compactUgx(total)}</span>
        </div>
      </div>

      <ul className="m-0 flex min-w-0 flex-[1_1_160px] list-none flex-col gap-3 p-0">
        {slices.map((slice) => (
          <li key={slice.name} className="flex items-start gap-2 text-body tracking-body">
            <span
              className="mt-[3px] box-content size-[14px] flex-none rounded-[2px] border border-moss"
              style={{ background: slice.color }}
            />
            <span className="min-w-0">
              <span className="block font-bold">
                {slice.name} · {slice.percent}%
              </span>
              <span className="block text-label text-moss tabular-nums">
                {formatUgx(slice.amount)}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
