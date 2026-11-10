// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import type { Project, SessionInfo, Workspace } from "../../api";
import { dispatchProjectIcon } from "../../personalOs/dispatchPresentation";
import { ProjectSessionNavigation } from "./ProjectSessionNavigation";

const projectOne = project("project-1", "Claryo");
const projectTwo = project("project-2", "Personal console");
const main = workspace("main", "project-1", "Main", true);
const feature = workspace("feature", "project-1", "Auth worktree", false);
const mainSession = session("session-main", main, "Plan release", "Coordinate the release plan, verification, and rollout notes across the project.");
const featureSession = session("session-feature", feature, "Fix authentication", "Trace the OAuth callback failure and repair authentication in the feature worktree.");

afterEach(() => {
  document.body.replaceChildren();
});

describe("ProjectSessionNavigation", () => {
  it("renders one selected-Project header and that Project's Chats", async () => {
    const navigation = await mountNavigation();
    const root = requiredShadowRoot(navigation);

    expect(root.querySelector('nav[aria-label="Dispatch"]')).toBeInstanceOf(HTMLElement);
    expect(root.querySelector(".project-name")?.textContent).toBe("Claryo");
    expect(root.querySelector(".project-icon")?.textContent).toBe(dispatchProjectIcon(projectOne));
    expect(root.querySelector(".chat-list")?.textContent).toContain("Plan release");
    expect(root.querySelector(".chat-list")?.textContent).toContain("Fix authentication");
    expect(root.querySelector(".chat-list")?.textContent).toContain("Coordinate the release plan, verification, and rollout notes across the project.");
    expect(root.querySelector(".chat-list")?.textContent).toContain("Trace the OAuth callback failure and repair authentication in the feature worktree.");
    expect(root.querySelector(".chat-list")?.textContent).not.toContain("Auth worktree · worktree · 2");
    expect(root.querySelector(".chat-list")?.textContent).not.toContain("Personal console");
    expect(root.querySelectorAll(".session-summary")).toHaveLength(2);
    expect(root.querySelector(".chat-row > .chat-glyph")?.textContent).toBe("");
    expect(root.querySelector(".scheduled")?.getAttribute("aria-disabled")).toBe("true");
  });

  it("switches Project from the header picker", async () => {
    const onSelectProject = vi.fn();
    const navigation = await mountNavigation({ onSelectProject });
    const root = requiredShadowRoot(navigation);

    buttonByExactText(root, "Personal console").click();

    expect(onSelectProject).toHaveBeenCalledExactlyOnceWith(projectTwo);
  });

  it("selects a Chat together with the workspace that owns it", async () => {
    const onSelectSession = vi.fn();
    const navigation = await mountNavigation({ onSelectSession });

    buttonByText(requiredShadowRoot(navigation), "Fix authentication").click();

    expect(onSelectSession).toHaveBeenCalledExactlyOnceWith(feature, featureSession);
  });

  it("starts New chat in the currently selected workspace", async () => {
    const onStartSession = vi.fn();
    const navigation = await mountNavigation({ onStartSession });
    navigation.selectedWorkspace = feature;
    await navigation.updateComplete;

    buttonByExactText(requiredShadowRoot(navigation), "New chat").click();

    expect(onStartSession).toHaveBeenCalledExactlyOnceWith(feature);
  });

  it("keeps secondary utility and per-worktree actions in the Dispatch menu", async () => {
    const onStartSession = vi.fn();
    const onAddProject = vi.fn();
    const onBrowseRuntime = vi.fn();
    const navigation = await mountNavigation({ onStartSession, onAddProject, onBrowseRuntime });
    const root = requiredShadowRoot(navigation);
    const menu = root.querySelector("details.navigation-menu");
    if (!(menu instanceof HTMLDetailsElement)) throw new Error("Expected Dispatch menu");

    menu.open = true;
    menuButtonByExactText(menu, "Auth worktree").click();
    expect(menu.open).toBe(false);
    menu.open = true;
    menuButtonByExactText(menu, "Add Project").click();
    menu.open = true;
    menuButtonByExactText(menu, "Runtime browser").click();

    expect(onStartSession).toHaveBeenCalledWith(feature);
    expect(onAddProject).toHaveBeenCalledOnce();
    expect(onBrowseRuntime).toHaveBeenCalledOnce();
  });
});

async function mountNavigation(overrides: Partial<ProjectSessionNavigation> = {}): Promise<ProjectSessionNavigation> {
  const navigation = new ProjectSessionNavigation();
  navigation.projects = [projectOne, projectTwo];
  navigation.selectedProject = projectOne;
  navigation.groups = [
    { workspace: main, sessions: [mainSession] },
    { workspace: feature, sessions: [featureSession] },
  ];
  navigation.selectedWorkspace = main;
  navigation.selectedSession = mainSession;
  Object.assign(navigation, overrides);
  document.body.append(navigation);
  await navigation.updateComplete;
  return navigation;
}

function project(id: string, name: string): Project {
  return { id, name, path: `/repo/${id}`, createdAt: "2026-08-17T00:00:00.000Z" };
}

function workspace(id: string, projectId: string, label: string, isMain: boolean): Workspace {
  return { id, projectId, path: `/repo/${projectId}/${id}`, label, isMain, effectiveConfig: {} };
}

function session(id: string, targetWorkspace: Workspace, name: string, firstMessage: string): SessionInfo {
  return {
    id,
    cwd: targetWorkspace.path,
    path: `${targetWorkspace.path}/${id}.jsonl`,
    created: "2026-08-17T00:00:00.000Z",
    modified: "2026-08-17T00:00:00.000Z",
    messageCount: 2,
    name,
    firstMessage,
  };
}

function buttonByText(root: ShadowRoot, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find((candidate) => candidate.textContent.includes(text));
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Expected button containing ${text}`);
  return button;
}

function buttonByExactText(root: ShadowRoot, text: string): HTMLButtonElement {
  const button = [...root.querySelectorAll("button")].find((candidate) => candidate.textContent.trim().endsWith(text));
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Expected button ${text}`);
  return button;
}

function menuButtonByExactText(menu: HTMLDetailsElement, text: string): HTMLButtonElement {
  const button = [...menu.querySelectorAll("button")].find((candidate) => candidate.textContent.trim().endsWith(text));
  if (!(button instanceof HTMLButtonElement)) throw new Error(`Expected menu button ${text}`);
  return button;
}

function requiredShadowRoot(element: Element): ShadowRoot {
  if (element.shadowRoot === null) throw new Error("Expected shadow root");
  return element.shadowRoot;
}
