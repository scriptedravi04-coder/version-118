import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

// Every URL the frontend posts to must exist on the backend.
//
// The Campaign/UGC split moved the frontend onto `/ugc/threads/...` and
// `/campaign/threads/...`, but five of those paths were never registered on the server:
//
//   /campaign/threads/:id/reject-live-links
//   /campaign/threads/:id/submit-review
//   /ugc/threads/:id/submit-review
//   /ugc/threads/:id/creator-negotiate
//   /ugc/threads/:id/brand-accept-counter
//
// Every one of them returned 404. Nothing caught it: TypeScript does not check template
// strings against Express registrations, the tests all passed, and the build was clean. The
// only symptom was a feature quietly not working.
//
// This test compares the two lists directly.

const ROOT = process.cwd();

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (entry === "node_modules" || entry === "dist" || entry.startsWith(".")) continue;
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) walk(full, out);
    else if (/\.(jsx?|tsx?)$/.test(entry) && !/\.test\./.test(entry)) out.push(full);
  }
  return out;
}

/** Routes the backend registers, as flow + action pairs. */
function backendRoutes(): Set<string> {
  const found = new Set<string>();
  for (const file of readdirSync(join(ROOT, "backend"))) {
    if (!file.endsWith(".ts") || file.includes(".test.")) continue;
    const src = readFileSync(join(ROOT, "backend", file), "utf8");
    for (const m of src.matchAll(/"\/(ugc|campaign)\/threads\/:[a-zA-Z]+\/([a-z-]+)"/g)) {
      found.add(`${m[1]}/${m[2]}`);
    }
  }
  return found;
}

/** Routes the frontend actually calls. */
function frontendCalls(): Map<string, string> {
  const found = new Map<string, string>();
  for (const file of walk(join(ROOT, "src"))) {
    const src = readFileSync(file, "utf8");
    for (const m of src.matchAll(/\/(ugc|campaign)\/threads\/\$\{[^}]*\}\/([a-z-]+)/g)) {
      const key = `${m[1]}/${m[2]}`;
      if (!found.has(key)) found.set(key, file.replace(ROOT + "/", ""));
    }
  }
  return found;
}

describe("frontend route calls resolve on the backend", () => {
  it("has no call to an unregistered /ugc or /campaign thread route", () => {
    const backend = backendRoutes();
    const calls = frontendCalls();

    const missing = [...calls.entries()]
      .filter(([route]) => !backend.has(route))
      .map(([route, file]) => `/${route.replace("/", "/threads/:id/")} called from ${file}`);

    expect(missing).toEqual([]);
  });

  it("actually found routes on both sides, so an empty scan cannot pass silently", () => {
    expect(backendRoutes().size).toBeGreaterThan(10);
    expect(frontendCalls().size).toBeGreaterThan(10);
  });
});
