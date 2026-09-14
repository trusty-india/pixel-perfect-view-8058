import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Storage bootstrap (SERVER ONLY — must never be imported from client code).
 *
 * Makes the two application buckets self-provisioning so the app never shows
 * "Bucket not found":
 *
 *  1. Bucket rows are created idempotently through the Storage admin API using
 *     the server-side service-role client (client.server.ts, never shipped to
 *     the browser).
 *  2. The per-bucket access policies (public read, owner-scoped writes, admin
 *     management) are applied as idempotent SQL through the Postgres
 *     connection, mirroring drizzle/migrations/0002_storage_buckets_and_policies.sql.
 *
 * Safe to run any number of times: bucket creation is upsert-by-id and policy
 * statements are `drop policy if exists` + `create policy`.
 *
 * The Postgres URL is optional — when absent, the runtime provisioner falls
 * back to the SQL policies created by migration 0002 (which run automatically
 * wherever drizzle migrations are applied).
 */

const IMAGE_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
] as const;

const PROFILE_BUCKET = {
  id: "profile-images",
  public: true,
  file_size_limit: 5_242_880, // 5 MB
  allowed_mime_types: IMAGE_MIME_TYPES,
} as const;

const PROPERTY_BUCKET = {
  id: "property-images",
  public: true,
  file_size_limit: 10_485_760, // 10 MB
  allowed_mime_types: IMAGE_MIME_TYPES,
} as const;

/**
 * Idempotent policy SQL — exactly mirrors migration 0002. Applied opportunistically
 * whenever a Postgres migration URL is available so deployed environments that
 * provision storage BEFORE running drizzle migrations still end up correct.
 */
const STORAGE_POLICY_SQL = `
-- profile-images
drop policy if exists "profile images public read" on storage.objects;
create policy "profile images public read" on storage.objects
  for select to public
  using (bucket_id = 'profile-images');

drop policy if exists "profile images owner insert" on storage.objects;
create policy "profile images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'profile-images'
    and owner::text = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "profile images owner update" on storage.objects;
create policy "profile images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'profile-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

drop policy if exists "profile images owner delete" on storage.objects;
create policy "profile images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'profile-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

-- property-images
drop policy if exists "property images public read" on storage.objects;
create policy "property images public read" on storage.objects
  for select to public
  using (bucket_id = 'property-images');

drop policy if exists "property images owner insert" on storage.objects;
create policy "property images owner insert" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'property-images'
    and owner::text = auth.uid()::text
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "property images owner update" on storage.objects;
create policy "property images owner update" on storage.objects
  for update to authenticated
  using (
    bucket_id = 'property-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );

drop policy if exists "property images owner delete" on storage.objects;
create policy "property images owner delete" on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'property-images'
    and (owner::text = auth.uid()::text or public.is_admin())
  );
`;

export type StorageProvisionResult = {
  buckets: string[];
  policiesApplied: boolean;
  warnings: string[];
};

let provisionPromise: Promise<StorageProvisionResult> | null = null;

async function applyPolicySql(): Promise<boolean> {
  const connectionString =
    process.env["LOVABLE_DB_MIGRATION_URL"] ??
    process.env["DATABASE_URL"] ??
    process.env["SUPABASE_DB_URL"] ??
    "";
  if (!connectionString) return false;

  try {
    const postgres = (await import("postgres")).default;
    const sql = postgres(connectionString, { max: 1, prepare: false });
    try {
      await sql.unsafe(STORAGE_POLICY_SQL);
      return true;
    } finally {
      await sql.end({ timeout: 5 });
    }
  } catch (error) {
    console.warn(
      "[storage] Policy SQL could not be applied at runtime:",
      error instanceof Error ? error.message : error,
    );
    return false;
  }
}

/**
 * Ensures both application buckets exist and their policies are applied.
 * Runs at most once per server process (concurrent callers share the result).
 */
export async function ensureStorageBuckets(
  admin: SupabaseClient,
): Promise<StorageProvisionResult> {
  provisionPromise ??= (async () => {
    const warnings: string[] = [];
    const buckets: string[] = [];

    for (const bucket of [PROFILE_BUCKET, PROPERTY_BUCKET]) {
      const { error } = await admin.storage.createBucket(bucket.id, {
        public: bucket.public,
        file_size_limit: bucket.file_size_limit,
        allowed_mime_types: [...bucket.allowed_mime_types],
      });
      if (!error) {
        buckets.push(bucket.id);
        continue;
      }
      // "Bucket already exists" / duplicate errors mean the bucket is present —
      // that is success for an idempotent provisioner.
      const message = error.message.toLowerCase();
      if (message.includes("exist") || message.includes("duplicate")) continue;
      warnings.push(`${bucket.id}: ${error.message}`);
    }

    const policiesApplied = await applyPolicySql();
    if (!policiesApplied) {
      warnings.push(
        "policy SQL not applied at runtime (no Postgres URL) — migration 0002 provides them",
      );
    }

    if (warnings.length) {
      console.warn("[storage] provisioning warnings:", warnings);
    }
    return { buckets, policiesApplied, warnings };
  })();

  return provisionPromise;
}
