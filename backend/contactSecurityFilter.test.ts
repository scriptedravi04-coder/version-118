import { describe, it, expect, beforeEach } from "vitest";
import {
  checkComprehensiveDisallowedContent as check,
  resetRecentMessageBuffer,
  wordsToDigits,
  decodeLeet
} from "./contactSecurityFilter";

beforeEach(() => resetRecentMessageBuffer());

const blocked = (t: string, o?: any) => check(t, o).blocked;

describe("blocks real contact sharing", () => {
  it("plain 10-digit mobile", () => {
    expect(blocked("my number is 9876543210")).toBe(true);
  });

  it("mobile split by spaces, dashes or country code", () => {
    expect(blocked("98765 43210")).toBe(true);
    expect(blocked("+91-98765-43210")).toBe(true);
    expect(blocked("9 8 7 6 5 4 3 2 1 0")).toBe(true);
  });

  it("email, including obfuscated forms", () => {
    expect(blocked("mail me at ravi@gmail.com")).toBe(true);
    expect(blocked("ravi [at] gmail [dot] com")).toBe(true);
  });

  it("messaging app links", () => {
    expect(blocked("https://wa.me/919876543210")).toBe(true);
    expect(blocked("ping me t.me/ravi04")).toBe(true);
  });

  it("social handles", () => {
    expect(blocked("ig: itz_kitto_8745")).toBe(true);
    expect(blocked("insta id @babu_bhaiya")).toBe(true);
  });

  it("numbers spelled in English or Hindi words", () => {
    expect(blocked("nine eight seven six five four three two one zero")).toBe(true);
    expect(blocked("nau aath saat chhe paanch chaar teen do ek shunya")).toBe(true);
  });

  it("leetspeak digits", () => {
    expect(blocked("98I654327O")).toBe(true);
  });

  it("a contact word sitting next to digits", () => {
    expect(blocked("contact me on 98765 43210")).toBe(true);
    expect(blocked("whatsapp 9876543")).toBe(true);
  });
});

describe("chunking across messages", () => {
  const ctx = { threadId: "t1", senderId: "u1" };

  it("catches 5 + 5 split over two messages", () => {
    expect(blocked("98765", ctx)).toBe(false);
    expect(blocked("43210", ctx)).toBe(true);
  });

  it("catches 3 + 3 + 4 split over three messages", () => {
    expect(blocked("987", ctx)).toBe(false);
    expect(blocked("654", ctx)).toBe(false);
    expect(blocked("3210", ctx)).toBe(true);
  });

  it("keeps separate senders apart", () => {
    expect(blocked("98765", { threadId: "t1", senderId: "u1" })).toBe(false);
    expect(blocked("43210", { threadId: "t1", senderId: "u2" })).toBe(false);
  });

  it("forgets chunks older than the 5 minute window", () => {
    const t0 = 1_000_000;
    expect(blocked("98765", { ...ctx, now: t0 })).toBe(false);
    expect(blocked("43210", { ...ctx, now: t0 + 6 * 60 * 1000 })).toBe(false);
  });
});

// These are the cases that make or break the feature in practice. A filter that blocks
// ordinary deal conversation gets worked around, and then it protects nothing.
describe("does NOT block legitimate messages", () => {
  it("contact words used in their ordinary sense", () => {
    expect(blocked("Is this for iPhone or Android?")).toBe(false);
    expect(blocked("Who should I contact about the shipment?")).toBe(false);
    expect(blocked("My phone broke so I was offline yesterday")).toBe(false);
    expect(blocked("Shoot it in mobile portrait, not landscape")).toBe(false);
    expect(blocked("Please keep the phone out of frame")).toBe(false);
  });

  it("words that merely contain a keyword", () => {
    expect(blocked("we need better mobility in the shot")).toBe(false);
    expect(blocked("the contactless payment scene")).toBe(false);
  });

  it("money and deal numbers", () => {
    expect(blocked("budget is 3500 for 2 reels")).toBe(false);
    expect(blocked("I can do 12000 for the full package")).toBe(false);
    expect(blocked("890000 followers, avg reach 2300000")).toBe(false);
  });

  it("a price discussion spread over several messages", () => {
    const ctx = { threadId: "t2", senderId: "u9" };
    expect(blocked("3500", ctx)).toBe(false);
    expect(blocked("4200", ctx)).toBe(false);
    expect(blocked("2000", ctx)).toBe(false);
  });

  it("allowed content links", () => {
    expect(blocked("here it is https://www.instagram.com/reel/Cx1y2z3/")).toBe(false);
    expect(blocked("draft: https://drive.google.com/file/d/abc123/view")).toBe(false);
    expect(blocked("https://youtube.com/watch?v=abc12345678")).toBe(false);
  });

  it("dates, pincodes and order references", () => {
    expect(blocked("deadline is 18/09/2026")).toBe(false);
    expect(blocked("my pincode is 313001")).toBe(false);
  });

  it("anything marked exempt, such as revision feedback", () => {
    expect(blocked("call me on 9876543210", { exempt: true })).toBe(false);
  });
});

describe("helpers", () => {
  it("wordsToDigits picks the longest run", () => {
    expect(wordsToDigits("nine eight seven")).toBe("987");
    expect(wordsToDigits("ek do teen")).toBe("123");
  });

  it("decodeLeet maps look-alike characters to digits", () => {
    expect(decodeLeet("I0O")).toBe("100");
  });
});
