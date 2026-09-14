import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState, Section } from "@/components/section";
import { listingsQuery } from "@/lib/data";
import { useCity } from "@/lib/city";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student Zone — rooms & PGs in Lucknow | 29Bricks" },
      {
        name: "description",
        content: "Affordable PGs, sharing rooms and student-friendly rentals near your college.",
      },
      { property: "og:title", content: "Student Zone — 29Bricks" },
      { property: "og:description", content: "Budget rooms and PGs for students." },
    ],
  }),
  component: StudentPage,
});

function StudentPage() {
  const { city } = useCity();
  const { data: studentPicks } = useQuery(
    listingsQuery({ city, audience: "student", limit: 30 }),
  );
  const { data: pgs } = useQuery(listingsQuery({ city, propertyType: "PG", limit: 20 }));
  const { data: rooms } = useQuery(listingsQuery({ city, propertyType: "Room", limit: 20 }));

  return (
    <AppShell>
      <div className="rounded-3xl gradient-sky p-5 text-sky-foreground shadow-soft">
        <h1 className="font-display text-2xl font-bold">Student Zone</h1>
        <p className="mt-1 text-xs opacity-90">
          Budget rooms, PGs and sharing options in {city}.
        </p>
      </div>

      <Section title="Student friendly">
        {studentPicks?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(studentPicks as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState text="No student rooms listed yet in this city." />
        )}
      </Section>

      <Section title="PG accommodation">
        {pgs?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(pgs as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState text="No PGs listed yet." />
        )}
      </Section>

      <Section title="Single rooms">
        {rooms?.length ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {(rooms as ListingRow[]).map((l) => (
              <ListingCard key={l.id} listing={l} />
            ))}
          </div>
        ) : (
          <EmptyState text="No rooms listed yet." />
        )}
      </Section>
    </AppShell>
  );
}
