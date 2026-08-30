"use client";

import { useState, useTransition } from "react";
import { uploadAssetAction } from "@/lib/actions/upload";
import { X, Upload, Loader2 } from "lucide-react";

export function CloudinaryUploader({
  label,
  slot,
  value,
  publicId,
  onUploaded,
  onCleared,
}: {
  label: string;
  slot: "hero" | "mascot" | "logo";
  value: string | null;
  publicId: string | null;
  onUploaded: (r: { url: string; publicId: string }) => void;
  onCleared: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFile(file: File) {
    setError(null);
    if (file.size > 5 * 1024 * 1024) {
      setError("Max 5 MB");
      return;
    }
    if (!/^image\/(png|jpe?g|webp|svg\+xml)$/.test(file.type)) {
      setError("PNG / JPEG / WEBP / SVG only");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      startTransition(async () => {
        const res = await uploadAssetAction({ slot, dataUrl });
        if (!res.ok) setError(res.error);
        else onUploaded({ url: res.url, publicId: res.publicId });
      });
    };
    reader.onerror = () => setError("Could not read file");
    reader.readAsDataURL(file);
  }

  return (
    <div className="card p-4">
      <div className="mb-2 text-sm font-medium">{label}</div>
      {value ? (
        <div className="relative">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={value}
            alt={label}
            className="aspect-video w-full rounded-md object-cover"
          />
          <button
            type="button"
            onClick={onCleared}
            className="absolute right-2 top-2 rounded-full bg-black/60 p-1 text-white hover:bg-black/80"
            aria-label="Clear"
          >
            <X className="h-3 w-3" />
          </button>
          {publicId && (
            <code className="mt-2 block truncate text-[10px] text-[color:var(--color-muted-foreground)]">
              {publicId}
            </code>
          )}
        </div>
      ) : (
        <label className="flex aspect-video cursor-pointer flex-col items-center justify-center gap-2 rounded-md border border-dashed border-[color:var(--color-border)] text-xs text-[color:var(--color-muted-foreground)] hover:border-[color:var(--color-brand)]">
          {pending ? (
            <Loader2 className="h-5 w-5 animate-spin" />
          ) : (
            <>
              <Upload className="h-5 w-5" />
              <span>Click to upload</span>
              <span>PNG · JPEG · WEBP · SVG · ≤5 MB</span>
            </>
          )}
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={pending}
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
              e.target.value = "";
            }}
          />
        </label>
      )}
      {error && (
        <p className="mt-2 text-xs text-[color:var(--color-danger)]">{error}</p>
      )}
    </div>
  );
}
