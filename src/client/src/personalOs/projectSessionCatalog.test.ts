import { describe, expect, it } from "vitest";
import type { SessionInfo, Workspace } from "../api";
import { loadProjectSessionGroups } from "./projectSessionCatalog";

const main = workspace("main", "Main", true);
const feature = workspace("feature", "Feature", false);

function workspace(id: string, label: string, isMain: boolean): Workspace {
  return { id, projectId: "project-1", path: `/repo/${id}`, label, isMain, effectiveConfig: {} };
}

function session(id: string, cwd: string): SessionInfo {
  return { id, cwd, path: `${cwd}/${id}.jsonl`, created: "2026-08-17T00:00:00.000Z", modified: "2026-08-17T00:00:00.000Z", messageCount: 1, firstMessage: id };
}

describe("loadProjectSessionGroups", () => {
  it("puts the main workspace first and preserves each workspace session listing", async () => {
    const groups = await loadProjectSessionGroups([feature, main], (candidate) => Promise.resolve([session(`${candidate.id}-session`, candidate.path)]));

    expect(groups.map((group) => group.workspace.id)).toEqual(["main", "feature"]);
    expect(groups.map((group) => group.sessions[0]?.id)).toEqual(["main-session", "feature-session"]);
  });

  it("keeps healthy workspaces visible when another workspace cannot be listed", async () => {
    const groups = await loadProjectSessionGroups([main, feature], (candidate) => {
      if (candidate.id === "feature") return Promise.reject(new Error("workspace unavailable"));
      return Promise.resolve([session("main-session", candidate.path)]);
    });

    expect(groups[0]).toMatchObject({ workspace: { id: "main" }, sessions: [{ id: "main-session" }] });
    expect(groups[1]).toMatchObject({ workspace: { id: "feature" }, sessions: [], error: "workspace unavailable" });
  });
});
