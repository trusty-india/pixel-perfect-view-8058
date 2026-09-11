export function formatINR(value?: number | null): string {
  if (value === null || value === undefined) return "Price on request";
  if (value >= 10000000) return `₹${(value / 10000000).toFixed(2).replace(/\.00$/, "")} Cr`;
  if (value >= 100000) return `₹${(value / 100000).toFixed(2).replace(/\.00$/, "")} Lakh`;
  return `₹${new Intl.NumberFormat("en-IN").format(value)}`;
}

export function priceLabel(price: number | null, purpose: string): string {
  const base = formatINR(price);
  return purpose === "rent" && price ? `${base}/month` : base;
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export const PROPERTY_TYPES = [
  "House",
  "Flat",
  "Room",
  "PG",
  "Sharing Room",
  "Student Room",
  "Shop",
  "Office",
  "Commercial Space",
  "Land / Plot",
  "Other Property",
];

export const SERVICE_TYPES = [
  "Packers & Movers",
  "Electrician",
  "Plumber",
  "Carpenter",
  "Painter",
  "AC Repair",
  "RO Service",
  "Cleaning",
  "Pest Control",
  "CCTV",
  "Interior Design",
  "Architect",
  "Civil Contractor",
  "Renovation",
  "Furniture",
  "Appliance Repair",
  "Water Tanker",
  "Security",
  "Other Services",
];

export const LEAD_STATUSES = [
  "new",
  "contacted",
  "interested",
  "visit_scheduled",
  "negotiation",
  "booked",
  "sold",
  "rented",
  "closed",
  "lost",
];

export const FURNISHING = ["Unfurnished", "Semi-Furnished", "Fully Furnished"];
export const BHK_OPTIONS = ["1 RK", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5+ BHK"];
export const FACILITIES = [
  "Parking",
  "Lift",
  "Power Backup",
  "Water 24x7",
  "Wi-Fi",
  "Security",
  "Attached Bathroom",
  "Balcony",
  "Kitchen",
  "AC",
  "Mess / Tiffin",
  "Laundry",
];

export function statusTone(status: string): string {
  switch (status) {
    case "approved":
      return "bg-success/12 text-success";
    case "pending":
      return "bg-warning/20 text-warning-foreground";
    case "rejected":
      return "bg-destructive/12 text-destructive";
    default:
      return "bg-muted text-muted-foreground";
  }
}
