import type { SessionInfo, Workspace } from "../api";

export interface ProjectSessionGroup {
  workspace: Workspace;
  sessions: SessionInfo[];
  error?: string | undefined;
}

export type WorkspaceSessionLoader = (workspace: Workspace) => Promise<SessionInfo[]>;

/**
 * Build the selected project's session catalog without making one unavailable
 * worktree hide healthy worktrees. PI WEB session JSONL remains the source of
 * truth; this is only a navigation projection over workspace-scoped listings.
 */
export async function loadProjectSessionGroups(
  workspaces: readonly Workspace[],
  loadSessions: WorkspaceSessionLoader,
): Promise<ProjectSessionGroup[]> {
  const ordered = [...workspaces].sort(compareWorkspaces);
  return await Promise.all(ordered.map(async (workspace): Promise<ProjectSessionGroup> => {
    try {
      return { workspace, sessions: await loadSessions(workspace) };
    } catch (error) {
      return { workspace, sessions: [], error: errorMessage(error) };
    }
  }));
}

function compareWorkspaces(left: Workspace, right: Workspace): number {
  if (left.isMain !== right.isMain) return left.isMain ? -1 : 1;
  return left.label.localeCompare(right.label);
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}
