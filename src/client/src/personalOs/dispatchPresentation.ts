import type { Project } from "../api";

const DEFAULT_PROJECT_ICONS = ["◆", "●", "▲", "■", "✦", "◇", "○", "△"] as const;

/**
 * Stable visual fallback until Project metadata grows a user-configurable icon.
 * The icon is presentation only: Project identity always remains the server id.
 */
export function dispatchProjectIcon(project: Pick<Project, "id">): string {
  let hash = 0;
  for (const character of project.id) hash = ((hash << 5) - hash + (character.codePointAt(0) ?? 0)) | 0;
  return DEFAULT_PROJECT_ICONS[Math.abs(hash) % DEFAULT_PROJECT_ICONS.length] ?? "◆";
}
