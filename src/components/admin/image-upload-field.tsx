import { useRef, useState } from "react";
import { Building2, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { uploadImage } from "@/lib/upload";
import { cn } from "@/lib/utils";

export function ImageUploadField({
  label,
  url,
  onUploaded,
  onRemove,
  folder = "admin",
  previewClassName,
}: {
  label: string;
  url: string | null;
  onUploaded: (url: string) => void;
  onRemove?: () => void;
  /** Storage subfolder inside the existing public-media bucket (default "admin"). */
  folder?: string;
  /** Optional override for the preview box size (e.g. wide hero preview). */
  previewClassName?: string;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setBusy(true);
    try {
      const uploaded = await uploadImage(file, folder);
      onUploaded(uploaded);
    } catch (error) {
      // error reporting handled by caller via toasts in most flows; surface here too
      console.error(error);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="rounded-2xl border bg-background p-3">
      <p className="text-xs font-semibold">{label}</p>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        <div
          className={cn(
            "grid place-items-center overflow-hidden rounded-2xl bg-muted text-muted-foreground",
            previewClassName ?? "size-16",
          )}
        >
          {url ? (
            <img src={url} alt={label} className="size-full object-cover" />
          ) : (
            <Building2 className="size-5" />
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          <input
            ref={inputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(event) => {
              void handleFile(event.target.files?.[0]);
              event.target.value = "";
            }}
          />
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="rounded-lg"
            disabled={busy}
            onClick={() => inputRef.current?.click()}
          >
            {busy ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Upload className="mr-1 size-3.5" />}
            {url ? "Change Image" : "Upload Image"}
          </Button>
          {url && onRemove ? (
            <Button type="button" size="sm" variant="ghost" className="rounded-lg text-destructive" onClick={onRemove}>
              <Trash2 className="size-4" />
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
