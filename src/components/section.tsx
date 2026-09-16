import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { ChevronRight } from "lucide-react";

export function Section({
  title,
  action,
  actionTo,
  actionSearch,
  children,
}: {
  title: string;
  action?: string;
  actionTo?: string;
  /** Optional typed search params for the action link (e.g. { type: "Room" }). */
  actionSearch?: Record<string, string | undefined>;
  children: ReactNode;
}) {
  return (
    <section className="mt-6">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-display text-base font-bold">{title}</h2>
        {action && actionTo ? (
          <Link
            to={actionTo}
            {...(actionSearch ? { search: actionSearch } : {})}
            className="flex items-center gap-0.5 rounded-full bg-wine-soft px-3 py-1.5 text-xs font-semibold text-wine-deep tap-scale"
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
