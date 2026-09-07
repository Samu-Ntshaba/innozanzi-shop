import { readFileSync } from "node:fs";
import { expect, it } from "vitest";

it("gives every non-linked lockfile package a version for npm installation", () => {
  const lock = JSON.parse(readFileSync("package-lock.json", "utf8")) as {
    packages: Record<string, { version?: string; link?: boolean }>;
  };
  const invalid = Object.entries(lock.packages)
    .filter(([path, entry]) => path && !entry.link && (!entry.version || !entry.version.trim()))
    .map(([path]) => path);
  expect(invalid).toEqual([]);
});
