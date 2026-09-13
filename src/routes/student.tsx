import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { GraduationCap } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { ListingCard, type ListingRow } from "@/components/listing-card";
import { EmptyState, Section } from "@/components/section";
import { listingsQuery } from "@/lib/data";
import { useCity } from "@/lib/city";

export const Route = createFileRoute("/student")({
  head: () => ({
    meta: [
      { title: "Student rooms, PG & sharing in Lucknow — 29Bricks" },
      {
        name: "description",
        content:
          "Affordable student rooms, PGs and sharing accommodation near colleges and coaching hubs in Lucknow.",
      },
      { property: "og:title", content: "Student Zone — 29Bricks" },
      {
        property: "og:description",
        content: "Budget-friendly rooms and PGs picked for students.",
      },
    ],
  }),
  component: StudentZone,
});

function StudentZone() {
  const { city } = useCity();
  const { data: studentPicks } = useQuery(
    listingsQuery({ city, audience: "student", limit: 20 }),
  );
  const { data: pgs } = useQuery(listingsQuery({ city, propertyType: "PG", limit: 20 }));
  const { data: rooms } = useQuery(listingsQuery({ city, propertyType: "Room", limit: 20 }));

  return (
    <AppShell>
      <div className="rounded-3xl gradient-sky p-5 text-sky-foreground shadow-soft">
        <GraduationCap className="size-7" />
        <h1 className="mt-2 font-display text-xl font-bold">Student Zone</h1>
        <p className="mt-1 text-xs opacity-90">
          Rooms, PGs and sharing options near colleges in {city}.
        </p>
      </div>

      <Section title="Picked for students">
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
