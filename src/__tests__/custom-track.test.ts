import { describe, expect, it } from "vitest";
import { resolveTrackArtUrl, customSongIdFromTitle } from "@/lib/maimai/image";
import { normalizeMaimaiSong } from "@/lib/maimai/types";

describe("custom track helpers", () => {
  it("keeps direct image URLs unchanged", () => {
    const url = "https://cdn.example.com/cover.jpg";
    expect(resolveTrackArtUrl(url)).toBe(url);
  });

  it("unwraps a Next image proxy URL back to the original remote asset", () => {
    const proxyUrl =
      "http://localhost:3000/_next/image?url=https%3A%2F%2Fdp4p6x0xfi5o9.cloudfront.net%2Fmaimai%2Fimg%2Fcover%2F62f55591b921a168db75481c1ba79af0784a3f74ca541b3aafb7ac4181d11f6f.png&w=3840&q=75";

    expect(resolveTrackArtUrl(proxyUrl)).toBe(
      "https://dp4p6x0xfi5o9.cloudfront.net/maimai/img/cover/62f55591b921a168db75481c1ba79af0784a3f74ca541b3aafb7ac4181d11f6f.png",
    );
  });

  it("builds a stable custom song key from a title", () => {
    expect(customSongIdFromTitle("AstroDX - Galaxy Mix")).toBe(
      "custom-astrodx-galaxy-mix",
    );
  });

  it("accepts the live CloudFront payload shape with songId and category", () => {
    const normalized = normalizeMaimaiSong({
      songId: "s1",
      title: "君の知らない物語",
      artist: "supercell",
      category: "POPS＆アニメ",
      imageName: "cover.png",
      version: "maimai",
      sheets: [],
    });

    expect(normalized.songId).toBe("s1");
    expect(normalized.category).toBe("POPS＆アニメ");
    expect(normalized.title).toBe("君の知らない物語");
  });
});
