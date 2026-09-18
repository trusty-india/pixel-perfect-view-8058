/**
 * Minimal page-transition direction flags (no new dependencies).
 *
 * The Home "Explore by Category" carousel arms a direction right before
 * navigating; the destination page consumes the flag on mount to play a
 * smooth horizontal slide-in. The search page re-arms the flag on browser
 * back-navigation so Home slides back in from the left.
 *
 * Plain module state is intentional: it must be readable synchronously
 * during the very first render (useState initial value) so the animation
 * class is present from the first painted frame.
 */

const KEY = "bricks-page-transition";

function flags(): Set<string> {
  const g = globalThis as typeof globalThis & {
    __bricksPageTransition?: Set<string>;
  };
  g.__bricksPageTransition ??= new Set<string>();
  return g.__bricksPageTransition;
}

/** Arm a transition direction ("forward" | "back") to be consumed on next mount. */
export function armPageTransition(direction: "forward" | "back") {
  flags().add(KEY + ":" + direction);
}

/** Consume an armed direction (returns null when none is pending). */
export function consumePageTransition(): "forward" | "back" | null {
  const f = flags();
  if (f.has(KEY + ":forward")) {
    f.delete(KEY + ":forward");
    return "forward";
  }
  if (f.has(KEY + ":back")) {
    f.delete(KEY + ":back");
    return "back";
  }
  return null;
}

/** Clear any pending direction (e.g. non-category navigation should not animate). */
export function clearPageTransition() {
  flags().delete(KEY + ":forward");
  flags().delete(KEY + ":back");
}

/** Whether a direction is pending without consuming it. */
export function hasPageTransition(direction: "forward" | "back") {
  return flags().has(KEY + ":" + direction);
}
