import { describe, expect, it } from "vitest";
import { resolveTrackArtUrl, customSongIdFromTitle } from "@/lib/maimai/image";

describe("custom track helpers", () => {
  it("keeps direct image URLs unchanged", () => {
    const url = "https://cdn.example.com/cover.jpg";
    expect(resolveTrackArtUrl(url)).toBe(url);
  });

  it("builds a stable custom song key from a title", () => {
    expect(customSongIdFromTitle("AstroDX - Galaxy Mix")).toBe(
      "custom-astrodx-galaxy-mix",
    );
  });
});
