import type { ComponentType } from "react";
import {
  BedDouble,
  GraduationCap,
  Home,
  KeyRound,
  Mountain,
  Store,
  Truck,
  Wrench,
  LayoutGrid,
} from "lucide-react";

/**
 * Database `categories.icon` values are plain lucide-react icon names, e.g.
 * "Home", "KeyRound". Resolve them through this map and render the component —
 * never render the name itself as visible text.
 */
export const CATEGORY_ICON_MAP: Record<string, ComponentType<{ className?: string }>> = {
  Home,
  KeyRound,
  Mountain,
  Store,
  BedDouble,
  GraduationCap,
  Wrench,
  Truck,
  LayoutGrid,
};

/** Case-insensitive lookup with a LayoutGrid fallback icon. */
export function categoryIcon(name?: string | null): ComponentType<{ className?: string }> {
  if (!name) return LayoutGrid;
  const normalized = name.trim();
  return (
    CATEGORY_ICON_MAP[normalized] ??
    CATEGORY_ICON_MAP[
      normalized.charAt(0).toUpperCase() + normalized.slice(1).toLowerCase()
    ] ??
    CATEGORY_ICON_MAP[normalized.toLowerCase()] ??
    LayoutGrid
  );
}
