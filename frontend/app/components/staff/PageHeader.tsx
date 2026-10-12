import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Right side: chips, a toggle group or a primary button. */
  children?: ReactNode;
}

export function PageHeader({ title, subtitle, children }: PageHeaderProps) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="m-0 text-title font-normal">{title}</h1>
        {subtitle ? (
          <p className="mt-1 mb-0 text-body tracking-body text-moss">{subtitle}</p>
        ) : null}
      </div>
      {children}
    </div>
  );
}
