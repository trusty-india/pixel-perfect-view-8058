import { Link, useRouterState } from "@tanstack/react-router";
import { useState, type ReactNode } from "react";
import {
  BadgeIndianRupee,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Flag,
  Handshake,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  MessageCircle,
  Package,
  PhoneCall,
  Shapes,
  SlidersHorizontal,
  Star,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { settingsQuery } from "@/lib/data";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

type AdminNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
};

const NAV_SECTIONS: Array<{ title: string; items: AdminNavItem[] }> = [
  {
    title: "Overview",
    items: [
      { to: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { to: "/admin/reports", label: "Reports", icon: Flag },
    ],
  },
  {
    title: "Marketplace",
    items: [
      { to: "/admin/listings", label: "Listings", icon: Building2 },
      { to: "/admin/requirements", label: "Requirements", icon: MapPin },
      { to: "/admin/services", label: "Services", icon: Wrench },
      { to: "/admin/featured", label: "Featured Listings", icon: Star },
      { to: "/admin/brokers", label: "Brokers", icon: Briefcase },
    ],
  },
  {
    title: "Pipeline",
    items: [
      { to: "/admin/leads", label: "Leads", icon: CircleDollarSign },
      { to: "/admin/offers", label: "Offers", icon: Handshake },
      { to: "/admin/visits", label: "Visits", icon: CalendarClock },
      { to: "/admin/parcels", label: "Parcels", icon: Package },
      { to: "/admin/contacts", label: "Contacts", icon: PhoneCall },
      { to: "/admin/chat", label: "Chat", icon: MessageCircle },
      { to: "/admin/commission", label: "Commission", icon: BadgeIndianRupee },
    ],
  },
  {
    title: "People",
    items: [{ to: "/admin/users", label: "Users", icon: Users }],
  },
  {
    title: "Site content",
    items: [
      { to: "/admin/cities", label: "Cities & Locations", icon: MapPin },
      { to: "/admin/categories", label: "Categories", icon: Shapes },
      { to: "/admin/announcements", label: "Announcements", icon: Bell },
    ],
  },
  {
    title: "Configuration",
    items: [{ to: "/admin/settings", label: "Business Profile & Settings", icon: SlidersHorizontal }],
  },
];

function isActive(pathname: string, to: string): boolean {
  if (to === "/admin") return pathname === "/admin";
  return pathname.startsWith(to);
}

function NavList({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  return (
    <nav className="grid gap-4">
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="grid gap-1">
          <p className="px-3 text-[10px] font-bold uppercase tracking-[0.14em] text-muted-foreground">
            {section.title}
          </p>
          {section.items.map((item) => (
            <Link
              key={`${item.to}-${item.label}`}
              to={item.to}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-medium tap-scale",
                isActive(pathname, item.to)
                  ? "bg-primary text-primary-foreground shadow-soft"
                  : "text-foreground/80 hover:bg-muted",
              )}
            >
              <item.icon className="size-4" />
              {item.label}
            </Link>
          ))}
        </div>
      ))}
    </nav>
  );
}

function AdminIdentity() {
  const { user, profile, signOut } = useAuth();
  return (
    <div className="flex items-center gap-2 rounded-2xl border bg-card p-2.5">
      <Avatar className="size-9 rounded-xl">
        <AvatarImage src={profile?.avatar_url ?? undefined} alt={profile?.full_name ?? "Admin"} />
        <AvatarFallback className="rounded-xl bg-primary/10 text-primary">
          {(profile?.full_name ?? "A").slice(0, 1).toUpperCase()}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="truncate text-xs font-semibold">{profile?.full_name ?? "Administrator"}</p>
        <p className="truncate text-[11px] text-muted-foreground">{user?.email ?? "Signed in"}</p>
      </div>
      <Button
        size="icon"
        variant="ghost"
        className="size-8 rounded-lg"
        aria-label="Sign out"
        onClick={async () => {
          await signOut();
          toast.success("Signed out");
        }}
      >
        <LogOut className="size-4" />
      </Button>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: settings } = useQuery(settingsQuery);

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r bg-card lg:flex">
        <div className="flex items-center gap-2 px-4 py-4">
          {settings?.logo_url ? (
            <img src={settings.logo_url} alt="logo" className="size-9 rounded-xl object-cover" />
          ) : (
            <span className="grid size-9 place-items-center rounded-xl gradient-brand text-primary-foreground">
              <Building2 className="size-5" />
            </span>
          )}
          <div className="min-w-0 leading-tight">
            <p className="truncate font-display text-sm font-bold">
              {settings?.business_name ?? "29Bricks"}
            </p>
            <p className="text-[10px] text-muted-foreground">Admin panel</p>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-3 pb-4">
          <NavList />
        </div>
        <div className="px-3 pb-4">
          <AdminIdentity />
        </div>
      </aside>

      {/* Mobile top bar */}
      <header className="sticky top-0 z-40 border-b glass-panel lg:hidden">
        <div className="flex items-center gap-2 px-4 py-3">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                size="icon"
                variant="outline"
                className="size-9 rounded-xl"
                aria-label="Open admin navigation"
              >
                <Menu className="size-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 overflow-y-auto p-4">
              <SheetTitle className="sr-only">Admin navigation</SheetTitle>
              <div className="mb-4 flex items-center gap-2">
                {settings?.logo_url ? (
                  <img src={settings.logo_url} alt="logo" className="size-8 rounded-lg object-cover" />
                ) : (
                  <span className="grid size-8 place-items-center rounded-lg gradient-brand text-primary-foreground">
                    <Building2 className="size-4" />
                  </span>
                )}
                <p className="font-display text-sm font-bold">{settings?.business_name ?? "29Bricks"}</p>
              </div>
              <NavList onNavigate={() => setMobileOpen(false)} />
              <div className="mt-4">
                <AdminIdentity />
              </div>
            </SheetContent>
          </Sheet>
          <div className="min-w-0 flex-1">
            <p className="truncate font-display text-sm font-bold">
              {settings?.business_name ?? "29Bricks"}
            </p>
            <p className="text-[10px] text-muted-foreground">Admin panel</p>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 lg:ml-64 lg:px-6 lg:py-6">{children}</main>
    </div>
  );
}
