import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
  ChevronRight,
  Heart,
  Home,
  MapPin,
  Plus,
  Search,
  ShieldCheck,
  User as UserIcon,
  Building2,
  Megaphone,
  Wrench,
} from "lucide-react";
import { settingsQuery, citiesQuery } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { useCity } from "@/lib/city";
import { cn } from "@/lib/utils";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

export function AppShell({ children }: { children: ReactNode }) {
  const { data: settings } = useQuery(settingsQuery);
  const { data: cities } = useQuery(citiesQuery);
  const { city, setCity } = useCity();
  const { isAdmin, user } = useAuth();
  const [postOpen, setPostOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/search", label: "Search", icon: Search },
    { to: "/saved", label: "Saved", icon: Heart },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-28">
      <header className="sticky top-0 z-40 glass-panel border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-2 px-4 py-3">
          <Link to="/" className="flex items-center gap-2.5">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={`${settings.business_name} logo`}
                className="size-10 rounded-xl object-cover shadow-soft"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-soft">
                <Building2 className="size-5" />
              </span>
            )}
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold tracking-tight">
                {settings?.business_name ?? "29Bricks"}
              </span>
              <span className="block text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                Powered by {settings?.powered_by ?? "Sarkar Properties"}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-1.5">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 w-auto gap-1 rounded-full border-border bg-card px-3 text-xs font-semibold shadow-soft">
                <MapPin className="size-3.5 text-brand" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(cities ?? []).map((c) => (
                  <SelectItem key={c.id} value={c.name} disabled={c.status !== "live"}>
                    {c.name}
                    {c.status !== "live" ? " — coming soon" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {isAdmin ? (
              <a
                href="/admin"
                className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary tap-scale"
                aria-label="Admin panel"
              >
                <ShieldCheck className="size-4" />
              </a>
            ) : null}
            <Link
              to="/profile"
              className="grid size-9 place-items-center rounded-full bg-primary/10 text-primary tap-scale"
              aria-label="Your profile"
            >
              {user && "email" in user && user.email ? (
                <span className="grid size-full place-items-center text-xs font-bold">
                  {user.email.charAt(0).toUpperCase()}
                </span>
              ) : (
                <UserIcon className="size-4" />
              )}
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 px-3 pb-safe">
        <div className="mx-auto max-w-5xl rounded-t-3xl border bg-card/95 shadow-[0_-8px_30px_-12px_oklch(0.45_0.12_264/0.25)] backdrop-blur-md">
          <div className="grid grid-cols-5 items-end px-1 pt-2 pb-2">
            {navItems.slice(0, 2).map((item) => (
              <NavTab key={item.to} {...item} active={pathname === item.to} />
            ))}
            <button
              type="button"
              onClick={() => setPostOpen(true)}
              className="mx-auto -mt-8 grid size-16 place-items-center rounded-full gradient-red text-brand-foreground shadow-glow ring-4 ring-card tap-scale"
              aria-label="Post something"
            >
              <Plus className="size-8" strokeWidth={2.5} />
            </button>
            {navItems.slice(2).map((item) => (
              <NavTab key={item.to} {...item} active={pathname === item.to} />
            ))}
          </div>
        </div>
      </nav>

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">What would you like to post?</DialogTitle>
            <p className="text-xs text-muted-foreground">Choose your option</p>
          </DialogHeader>
          <div className="grid gap-3">
            <PostOption
              to="/post/property"
              icon={<Home className="size-5" />}
              title="Post Property"
              subtitle="Sell, rent or lease your property"
              onClick={() => setPostOpen(false)}
            />
            <PostOption
              to="/post/requirement"
              icon={<Megaphone className="size-5" />}
              title="Post Requirement"
              subtitle="Tell us what you need"
              onClick={() => setPostOpen(false)}
            />
            <PostOption
              to="/post/service"
              icon={<Wrench className="size-5" />}
              title="Post Service"
              subtitle="Offer your services"
              onClick={() => setPostOpen(false)}
            />
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function NavTab({
  to,
  label,
  icon: Icon,
  active,
}: {
  to: string;
  label: string;
  icon: typeof Home;
  active: boolean;
}) {
  return (
    <Link
      to={to}
      className={cn(
        "flex flex-col items-center gap-0.5 rounded-xl py-1.5 text-[11px] font-semibold transition-colors",
        active ? "text-brand" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-5 transition-transform", active && "scale-110")} />
      {label}
    </Link>
  );
}

function PostOption({
  to,
  icon,
  title,
  subtitle,
  onClick,
}: {
  to: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
}) {
  return (
    <Link
      to={to}
      onClick={onClick}
      className="flex items-center gap-3 rounded-2xl border bg-card p-4 shadow-soft tap-scale"
    >
      <span className="grid size-12 shrink-0 place-items-center rounded-xl gradient-sky text-sky-foreground shadow-soft">
        {icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
      <ChevronRight className="size-5 shrink-0 text-muted-foreground" />
    </Link>
  );
}
