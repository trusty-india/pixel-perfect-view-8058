import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Briefcase,
  Building2,
  CalendarClock,
  CircleDollarSign,
  Handshake,
  MapPin,
  MessageCircle,
  PhoneCall,
  Shapes,
  Star,
  Users,
  Wrench,
} from "lucide-react";
import { PageHeader } from "@/components/admin/page-header";
import { dashboardStatsQuery } from "@/lib/admin-queries";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [{ title: "Admin dashboard — 29Bricks" }],
  }),
  component: AdminDashboard,
});

function StatCard({
  label,
  value,
  icon: Icon,
  to,
  tone = "default",
}: {
  label: string;
  value: number;
  icon: typeof Building2;
  to: string;
  tone?: "default" | "warning" | "success";
}) {
  return (
    <Link to={to} className="rounded-2xl border bg-card p-4 text-left shadow-soft tap-scale">
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span
          className={
            tone === "warning"
              ? "grid size-8 place-items-center rounded-xl bg-warning/15 text-warning-foreground"
              : tone === "success"
                ? "grid size-8 place-items-center rounded-xl bg-success/12 text-success"
                : "grid size-8 place-items-center rounded-xl bg-primary/10 text-primary"
          }
        >
          <Icon className="size-4" />
        </span>
      </div>
      <p className="mt-1 font-display text-2xl font-bold">{value}</p>
    </Link>
  );
}

function AdminDashboard() {
  const { data, isLoading, error } = useQuery(dashboardStatsQuery);

  return (
    <div className="grid gap-5">
      <PageHeader
        title="Admin control centre"
        description="Review submissions, manage leads and keep public business details current."
        actions={
          <Link to="/" className="rounded-xl border bg-card px-3 py-2 text-xs font-semibold tap-scale">
            View marketplace
          </Link>
        }
      />

      {isLoading ? (
        <div className="grid min-h-48 place-items-center rounded-3xl border bg-card">
          <span className="text-sm text-muted-foreground">Loading stats…</span>
        </div>
      ) : null}

      {error ? (
        <div className="rounded-3xl border border-destructive/30 bg-destructive/5 p-6 text-sm text-destructive">
          {error instanceof Error ? error.message : "Could not load dashboard stats"}
        </div>
      ) : null}

      {data ? (
        <>
          <section>
            <h2 className="mb-3 text-sm font-bold">Marketplace</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <StatCard label="Total listings" value={data.listings.total} icon={Building2} to="/admin/listings" />
              <StatCard label="Pending listings" value={data.listings.pending} icon={Building2} to="/admin/listings?status=pending" tone="warning" />
              <StatCard label="Approved listings" value={data.listings.approved} icon={Building2} to="/admin/listings?status=approved" tone="success" />
              <StatCard label="Featured listings" value={data.listings.featured} icon={Star} to="/admin/featured" />
              <StatCard label="Requirements" value={data.requirements.total} icon={MapPin} to="/admin/requirements" />
              <StatCard label="Pending requirements" value={data.requirements.pending} icon={MapPin} to="/admin/requirements?status=pending" tone="warning" />
              <StatCard label="Services" value={data.services.total} icon={Wrench} to="/admin/services" />
              <StatCard label="Pending services" value={data.services.pending} icon={Wrench} to="/admin/services?status=pending" tone="warning" />
              <StatCard label="Brokers" value={data.brokers.total} icon={Briefcase} to="/admin/brokers" />
              <StatCard label="Pending brokers" value={data.brokers.pending} icon={Briefcase} to="/admin/brokers?status=pending" tone="warning" />
              <StatCard label="Users" value={data.users.total} icon={Users} to="/admin/users" />
              <StatCard label="Active announcements" value={data.announcements.active} icon={Bell} to="/admin/announcements" />
            </div>
          </section>

          <section>
            <h2 className="mb-3 text-sm font-bold">Pipeline</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
              <StatCard label="Leads" value={data.leads.total} icon={CircleDollarSign} to="/admin/leads" />
              <StatCard label="New leads" value={data.leads.open} icon={CircleDollarSign} to="/admin/leads?status=new" tone="warning" />
              <StatCard label="Pending offers" value={data.offers.pending} icon={Handshake} to="/admin/offers?status=new" tone="warning" />
              <StatCard label="Pending visits" value={data.visits.pending} icon={CalendarClock} to="/admin/visits?status=new" tone="warning" />
              <StatCard label="Contact requests" value={data.contacts.total} icon={PhoneCall} to="/admin/contacts" />
              <StatCard label="Open chats" value={data.conversations.open} icon={MessageCircle} to="/admin/chat" />
              <StatCard label="Leads with commission" value={data.commission.count} icon={CircleDollarSign} to="/admin/commission" />
              <StatCard label="Categories" value={data.categories.total} icon={Shapes} to="/admin/categories" />
            </div>
          </section>

          <section className="rounded-3xl border bg-card p-4 shadow-soft">
            <h2 className="flex items-center gap-2 text-sm font-bold">
              <AlertTriangle className="size-4 text-warning" /> Needs attention
            </h2>
            <div className="mt-3 grid gap-2 sm:grid-cols-2">
              <AttentionRow label="Pending listings to moderate" value={data.listings.pending} to="/admin/listings?status=pending" />
              <AttentionRow label="Pending requirements to moderate" value={data.requirements.pending} to="/admin/requirements?status=pending" />
              <AttentionRow label="Pending services to moderate" value={data.services.pending} to="/admin/services?status=pending" />
              <AttentionRow label="Broker registrations to review" value={data.brokers.pending} to="/admin/brokers?status=pending" />
              <AttentionRow label="New leads" value={data.leads.open} to="/admin/leads?status=new" />
              <AttentionRow label="Pending offers" value={data.offers.pending} to="/admin/offers?status=new" />
              <AttentionRow label="Unresolved reports" value={data.reports.unresolved} to="/admin/reports" />
              <AttentionRow label="Open chats" value={data.conversations.open} to="/admin/chat" />
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

function AttentionRow({ label, value, to }: { label: string; value: number; to: string }) {
  if (value === 0) return null;
  return (
    <Link to={to} className="flex items-center justify-between gap-3 rounded-2xl border bg-background p-3 tap-scale">
      <span className="min-w-0 text-xs font-semibold">{label}</span>
      <span className="flex items-center gap-2">
        <span className="rounded-full bg-warning/20 px-2 py-0.5 text-[11px] font-bold text-warning-foreground">
          {value}
        </span>
        <ArrowRight className="size-3.5 text-muted-foreground" />
      </span>
    </Link>
  );
}
