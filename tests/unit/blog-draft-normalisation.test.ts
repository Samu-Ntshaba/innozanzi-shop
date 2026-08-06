import { describe, expect, it } from "vitest";
import { normaliseBlogDraft } from "@/domain/blog/draft";

describe("blog draft normalisation", () => {
  it("keeps generated metadata within publishing limits", () => {
    const result = normaliseBlogDraft({
      title: "A useful title",
      excerpt: "A practical excerpt that is already an acceptable length for the article listing.",
      content: "x".repeat(500),
      coverImageAlt: "A team reviewing business technology in an office",
      metaTitle: "A useful title for business technology teams",
      metaDescription: "A long generated description ".repeat(12),
    }) as Record<string, string>;

    expect(result.metaDescription.length).toBeLessThanOrEqual(170);
    expect(result.metaDescription.endsWith("…")).toBe(true);
    expect(result.title).toBe("A useful title");
  });
});
