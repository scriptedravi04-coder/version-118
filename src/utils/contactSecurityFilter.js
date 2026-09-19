// Frontend mirror of backend/contactSecurityFilter.ts.
//
// This exists so the user gets instant feedback instead of a round-trip, NOT as the
// enforcement point. The server runs the same checks independently — anything here can be
// bypassed by calling the API directly, so this file must never be the only barrier.
//
// Keep the rules in sync with the backend file. See that file for why bare contact
// keywords do not block on their own.
export { default } from "../../backend/contactSecurityFilter";
export * from "../../backend/contactSecurityFilter";
