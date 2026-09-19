import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, act, waitFor } from "@testing-library/react";

// The bug: save() calls refreshUser(), which changes the `user` object identity.
// That re-ran the hook's seed effect, which stamped the STALE seed row back over the
// values just saved — so the brand watched their edit vanish a moment after saving.
//
// These mocks stand in for the real modules the hook imports. `user` is deliberately
// a NEW object every time refreshUser() fires, which is exactly what AuthContext does.

let currentUser = { user_id: "u1", name: "Respiro", email: "ops@respiro.in" };
const refreshUser = vi.fn(async () => {
  currentUser = { ...currentUser };            // new identity, same data
  authListeners.forEach((fn) => fn());
});
const authListeners = [];

vi.mock("../../../../lib/api", () => ({
  api: { post: vi.fn(async () => ({ data: { ok: true } })), get: vi.fn(async () => ({ data: null })) },
}));
vi.mock("../../../../lib/supabase", () => ({ supabase: null }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), loading: vi.fn() } }));
vi.mock("../../../../contexts/AuthContext", () => ({
  useAuth: () => {
    const [, force] = React.useState(0);
    React.useEffect(() => {
      const fn = () => force((n) => n + 1);
      authListeners.push(fn);
      return () => authListeners.splice(authListeners.indexOf(fn), 1);
    }, []);
    return { user: currentUser, refreshUser };
  },
}));

import useBrandProfileData from "./useBrandProfileData";

// The stale row BrandProfile.jsx passes down as `brandData`. It is NOT re-fetched
// after a save, so if the effect re-runs it reintroduces the old description.
const STALE_SEED = {
  user_id: "u1",
  company_name: "Respiro",
  industry: "Fashion",
  description: "OLD description",
};

function Harness() {
  const { profile, save } = useBrandProfileData(STALE_SEED);
  return (
    <div>
      <span data-testid="description">{profile.description}</span>
      <button onClick={() => save({ description: "NEW description" })}>save</button>
    </div>
  );
}

describe("useBrandProfileData", () => {
  beforeEach(() => {
    currentUser = { user_id: "u1", name: "Respiro", email: "ops@respiro.in" };
  });

  it("keeps the saved value after refreshUser() changes the user identity", async () => {
    render(<Harness />);
    expect(screen.getByTestId("description").textContent).toBe("OLD description");

    await act(async () => {
      screen.getByText("save").click();
    });

    // refreshUser() has fired and re-rendered with a new user object. Before the
    // useRef guard this is where "OLD description" came back.
    expect(refreshUser).toHaveBeenCalled();
    await waitFor(() => {
      expect(screen.getByTestId("description").textContent).toBe("NEW description");
    });
  });
});
