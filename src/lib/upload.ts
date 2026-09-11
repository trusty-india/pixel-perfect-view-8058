import { supabase } from "@/integrations/supabase/client";

const TEN_YEARS = 60 * 60 * 24 * 365 * 10;

export async function uploadImage(file: File, folder: string): Promise<string> {
  const { data: auth } = await supabase.auth.getUser();
  const uid = auth.user?.id;
  if (!uid) throw new Error("Please sign in to upload images.");
  const ext = file.name.split(".").pop() || "jpg";
  const path = `${uid}/${folder}/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from("public-media").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signErr } = await supabase.storage
    .from("public-media")
    .createSignedUrl(path, TEN_YEARS);
  if (signErr || !data) throw signErr ?? new Error("Could not create image link");
  return data.signedUrl;
}

export async function uploadImages(files: FileList | File[], folder: string): Promise<string[]> {
  const list = Array.from(files);
  const urls: string[] = [];
  for (const file of list) {
    urls.push(await uploadImage(file, folder));
  }
  return urls;
}
