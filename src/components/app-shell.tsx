import { Link, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import {
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
  const { isAdmin } = useAuth();
  const [postOpen, setPostOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  const navItems = [
    { to: "/", label: "Home", icon: Home },
    { to: "/search", label: "Search", icon: Search },
    { to: "/saved", label: "Saved", icon: Heart },
    { to: "/profile", label: "Profile", icon: UserIcon },
  ] as const;

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="sticky top-0 z-40 glass-panel border-b">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3">
          <Link to="/" className="flex items-center gap-2">
            {settings?.logo_url ? (
              <img
                src={settings.logo_url}
                alt={`${settings.business_name} logo`}
                className="size-10 rounded-xl object-cover"
              />
            ) : (
              <span className="grid size-10 place-items-center rounded-xl gradient-brand text-primary-foreground shadow-soft">
                <Building2 className="size-5" />
              </span>
            )}
            <span className="leading-tight">
              <span className="block font-display text-lg font-bold">
                {settings?.business_name ?? "29Bricks"}
              </span>
              <span className="block text-[11px] text-muted-foreground">
                Powered by {settings?.powered_by ?? "Sarkar Properties"}
              </span>
            </span>
          </Link>

          <div className="ml-auto flex items-center gap-2">
            <Select value={city} onValueChange={setCity}>
              <SelectTrigger className="h-9 w-auto gap-1 rounded-full border-border bg-card px-3 text-xs font-semibold">
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
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-4">{children}</main>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t glass-panel">
        <div className="mx-auto grid max-w-5xl grid-cols-5 items-end px-2 py-2">
          {navItems.slice(0, 2).map((item) => (
            <NavTab key={item.to} {...item} active={pathname === item.to} />
          ))}
          <button
            type="button"
            onClick={() => setPostOpen(true)}
            className="mx-auto -mt-7 grid size-14 place-items-center rounded-2xl gradient-red text-brand-foreground shadow-glow tap-scale float-soft"
            aria-label="Post something"
          >
            <Plus className="size-7" />
          </button>
          {navItems.slice(2).map((item) => (
            <NavTab key={item.to} {...item} active={pathname === item.to} />
          ))}
        </div>
      </nav>

      <Dialog open={postOpen} onOpenChange={setPostOpen}>
        <DialogContent className="rounded-3xl">
          <DialogHeader>
            <DialogTitle>What would you like to post?</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <PostOption
              to="/post/property"
              icon={<Home className="size-5" />}
              title="Post Property"
              subtitle="Sell or rent your house, room, shop or land"
              onClick={() => setPostOpen(false)}
            />
            <PostOption
              to="/post/requirement"
              icon={<Megaphone className="size-5" />}
              title="Post Requirement"
              subtitle="Tell us what you are looking for"
              onClick={() => setPostOpen(false)}
            />
            <PostOption
              to="/post/service"
              icon={<Wrench className="size-5" />}
              title="Post Service"
              subtitle="List your service business"
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
        "flex flex-col items-center gap-1 rounded-xl py-1.5 text-[11px] font-medium transition-colors",
        active ? "text-primary" : "text-muted-foreground",
      )}
    >
      <Icon className={cn("size-5", active && "scale-110 transition-transform")} />
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
      <span className="grid size-11 place-items-center rounded-xl gradient-sky text-sky-foreground">
        {icon}
      </span>
      <span>
        <span className="block font-semibold">{title}</span>
        <span className="block text-xs text-muted-foreground">{subtitle}</span>
      </span>
    </Link>
  );
}
