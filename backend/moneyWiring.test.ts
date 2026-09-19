import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

// Guards the WIRING, not the implementation.
//
// backend/escrowService.test.ts covers the escrow service itself, but it imports that
// service directly — so it kept passing while `createEscrowTransaction` in server.ts was
// silently reverted to `return;`. The service was fine; nothing was calling it. The bug
// reappeared twice that way, and both times every test was green.
//
// These assertions read server.ts as text and fail if the stubs come back. Crude, but it
// is the failure mode that actually keeps happening: the work gets overwritten when a
// branch is built on an older base, and there is nothing in the type system or the unit
// tests to notice.

const SERVER = readFileSync(join(process.cwd(), "backend", "server.ts"), "utf8");

const bodyOf = (signature: string): string => {
  const start = SERVER.indexOf(signature);
  if (start === -1) throw new Error(`${signature} not found in server.ts`);
  return SERVER.slice(start, start + 1200);
};

describe("server.ts money functions are wired, not stubbed", () => {
  it("createEscrowTransaction delegates to the real escrow service", () => {
    const body = bodyOf("async function createEscrowTransaction(");
    expect(body).toContain("createEscrowTransactionService");
    // The stub was literally `async function createEscrowTransaction(a?, b?, c?) { return; }`
    expect(body).not.toMatch(/createEscrowTransaction\([^)]*\)\s*\{\s*return;\s*\}/);
  });

  it("isCreatorKycVerified actually queries for KYC records", () => {
    const body = bodyOf("async function isCreatorKycVerified(");
    expect(body).toContain("creator_kyc");
    // The stub was `async function isCreatorKycVerified(id) { return true; }`
    expect(body).not.toMatch(/isCreatorKycVerified\([^)]*\)\s*\{\s*return true;\s*\}/);
  });

  it("calculateFee uses the real fee calculator rather than returning zero", () => {
    const body = bodyOf("async function calculateFee(");
    expect(body).toContain("calculatePlatformFee");
    expect(body).not.toMatch(/function calculateFee\([^)]*\)\s*\{\s*return \{ fee: 0/);
  });

  it("the campaign routes still receive all three", () => {
    expect(SERVER).toContain("createEscrowTransaction, isCreatorKycVerified");
  });
});

describe("campaigns_routes.ts still calls them", () => {
  const CAMPAIGNS = readFileSync(join(process.cwd(), "backend", "campaigns_routes.ts"), "utf8");

  it("creates an escrow record when a campaign is created", () => {
    expect(CAMPAIGNS).toContain("await createEscrowTransaction({");
  });

  it("gates campaign applications on KYC", () => {
    expect(CAMPAIGNS).toContain("await isCreatorKycVerified(");
  });
});
