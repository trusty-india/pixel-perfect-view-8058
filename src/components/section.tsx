import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function Section({
  title,
  action,
  actionTo,
  children,
}: {
  title: string;
  action?: string;
  actionTo?: string;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">{title}</h2>
        {action && actionTo ? (
          <Link
            to={actionTo}
            className="flex items-center text-xs font-semibold text-primary tap-scale"
          >
            {action}
            <ChevronRight className="size-4" />
          </Link>
        ) : null}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ text }: { text: ReactNode }) {
  return (
    <div className="rounded-2xl border border-dashed bg-card/60 p-6 text-center text-sm text-muted-foreground">
      {text}
    </div>
  );
}

export function HScroll({ children }: { children: ReactNode }) {
  return (
    <div className="no-scrollbar -mx-4 flex gap-3 overflow-x-auto px-4 pb-1">{children}</div>
  );
}
