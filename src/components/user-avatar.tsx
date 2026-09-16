import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { User as UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Renders the signed-in user's actual DP from the existing auth profile.
 * Radix Avatar guarantees no broken-image icon: load failures fall back to
 * initials (or the user icon when there is no name yet).
 */
export function UserAvatar({
  src,
  name,
  className,
  iconClassName,
}: {
  src?: string | null | undefined;
  name?: string | null | undefined;
  className?: string;
  iconClassName?: string;
}) {
  const display =
    (name ?? "").trim() ||
    // When we know nothing yet, fall back to a neutral user glyph.
    "";
  const initials =
    display
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part.charAt(0).toUpperCase())
      .join("") || null;

  return (
    <Avatar className={cn("border-2 border-white/70 shadow-soft", className)}>
      {src ? <AvatarImage src={src} alt={display || "Profile photo"} /> : null}
      <AvatarFallback
        className={cn(
          "gradient-wine text-xs font-bold text-white",
          iconClassName,
        )}
      >
        {initials ? (
          initials
        ) : (
          <UserIcon className={cn("size-4", iconClassName)} />
        )}
      </AvatarFallback>
    </Avatar>
  );
}
