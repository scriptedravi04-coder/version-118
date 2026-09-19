// Frontend access to the single deal-flow source of truth.
//
// Deliberately a re-export, not a copy. Two copies of this logic is exactly the bug it
// exists to prevent — the frontend and backend must never be able to disagree about
// whether a given thread is UGC or Campaign.
//
// See backend/dealFlow.ts for the rules and why inline checks are banned.
export * from "../../backend/dealFlow";
export { default } from "../../backend/dealFlow";
