import { describe, expect, it } from "vitest";
import { dispatchProjectIcon } from "./dispatchPresentation";

describe("dispatchProjectIcon", () => {
  it("returns a stable visual fallback without changing Project identity", () => {
    const project = { id: "project-claryo" };

    expect(dispatchProjectIcon(project)).toBe(dispatchProjectIcon(project));
    expect(dispatchProjectIcon(project)).not.toBe("");
  });
});
