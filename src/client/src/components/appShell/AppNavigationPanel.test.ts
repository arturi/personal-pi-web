// @vitest-environment happy-dom

import { afterEach, describe, expect, it } from "vitest";
import type { Machine, Project, SessionInfo, Workspace } from "../../api";
import type { MachineStatusSnapshot } from "../../../../shared/machineStatus";
import { machineStatusSnapshot } from "../../machineStatus.testSupport";
import { MachineList } from "../MachineList";
import { MachineSwitcher } from "../MachineSwitcher";
import { ProjectList } from "../ProjectList";
import { WorkspaceList } from "../WorkspaceList";
import { ProjectSessionNavigation } from "../personalOs/ProjectSessionNavigation";
import { AppNavigationPanel, shouldShowMachinesSection } from "./AppNavigationPanel";

afterEach(() => {
  document.body.replaceChildren();
});

describe("shouldShowMachinesSection", () => {
  it("hides machine navigation when there is no machine choice", () => {
    expect(shouldShowMachinesSection([])).toBe(false);
    expect(shouldShowMachinesSection([machine("local")])).toBe(false);
  });

  it("shows machine navigation when there are multiple machines", () => {
    expect(shouldShowMachinesSection([machine("local"), machine("remote-a")])).toBe(true);
  });
});

describe("project and session shell seam", () => {
  it("renders the primary project/session navigation and keeps runtime details behind the menu", async () => {
    const panel = await mountPanel({}, machine("local"));
    const selectedProject = panel.projects[0];
    const selectedWorkspace = panel.workspaces[0];
    if (selectedProject === undefined || selectedWorkspace === undefined) throw new Error("Expected project and workspace fixtures");
    panel.selectedProject = selectedProject;
    panel.selectedWorkspace = selectedWorkspace;
    panel.projectSessionGroups = [{ workspace: selectedWorkspace, sessions: [session("session-1", selectedWorkspace)] }];
    await panel.updateComplete;

    const primary = section(panel, "project-session-navigation", ProjectSessionNavigation);
    const runtime = panel.shadowRoot?.querySelector("details.runtime-browser");
    if (!(runtime instanceof HTMLDetailsElement)) throw new Error("Expected runtime browser disclosure");
    expect(primary.projects).toEqual(panel.projects);
    expect(primary.groups).toEqual(panel.projectSessionGroups);
    expect(runtime.open).toBe(false);

    if (primary.shadowRoot === null) throw new Error("Expected project/session navigation shadow root");
    const browse = [...primary.shadowRoot.querySelectorAll("button")]
      .find((button) => button.textContent.includes("Runtime browser"));
    if (!(browse instanceof HTMLButtonElement)) throw new Error("Expected Runtime browser button");
    browse.click();
    expect(runtime.open).toBe(true);

    browse.click();
    expect(runtime.open).toBe(false);
  });
});

describe("machine status wiring", () => {
  it("gives machine sections every snapshot and project and workspace sections the selected machine's", async () => {
    const local = machineStatusSnapshot({ machine: { "core:working": true } });
    const remote = machineStatusSnapshot({ machine: { "core:unread": true } });
    const panel = await mountPanel({ local, "remote-a": remote }, machine("local"));

    expect(section(panel, "machine-switcher", MachineSwitcher).statusSnapshots).toEqual({ local, "remote-a": remote });
    expect(section(panel, "machine-list", MachineList).statusSnapshots).toEqual({ local, "remote-a": remote });
    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBe(local);
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBe(local);
  });

  it("reads the local machine's snapshot before a machine has been selected", async () => {
    // `selectedMachine` is undefined until machines load, and can stay undefined
    // if that load fails, while local project rows already render. The app keys
    // snapshots by `selectedMachine?.id ?? LOCAL_MACHINE_ID`, so this panel must
    // resolve the same id instead of blanking every indicator.
    const local = machineStatusSnapshot({ projects: { "project-1": { "core:working": true } } });
    const panel = await mountPanel({ local }, undefined);

    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBe(local);
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBe(local);
  });

  it("leaves project and workspace sections without a snapshot when the selected machine has none", async () => {
    const panel = await mountPanel({ "remote-a": machineStatusSnapshot() }, machine("local"));

    expect(section(panel, "project-list", ProjectList).statusSnapshot).toBeUndefined();
    expect(section(panel, "workspace-list", WorkspaceList).statusSnapshot).toBeUndefined();
  });
});

async function mountPanel(machineStatusSnapshots: Record<string, MachineStatusSnapshot>, selectedMachine: Machine | undefined): Promise<AppNavigationPanel> {
  const panel = new AppNavigationPanel();
  panel.compact = true;
  panel.machines = [machine("local"), machine("remote-a")];
  if (selectedMachine !== undefined) panel.selectedMachine = selectedMachine;
  panel.projects = [project("project-1")];
  panel.workspaces = [workspace("ws-1", "project-1")];
  panel.machineStatusSnapshots = machineStatusSnapshots;
  document.body.append(panel);
  await panel.updateComplete;
  return panel;
}

function section<T>(panel: AppNavigationPanel, selector: string, type: abstract new (...args: never) => T): T {
  const element = panel.shadowRoot?.querySelector(selector);
  if (!(element instanceof type)) throw new Error(`Expected a ${selector} section`);
  return element;
}

function machine(id: string): Machine {
  return {
    id,
    name: id,
    kind: id === "local" ? "local" : "remote",
    createdAt: "2026-06-04T00:00:00.000Z",
    updatedAt: "2026-06-04T00:00:00.000Z",
  };
}

function project(id: string): Project {
  return { id, name: id, path: `/repo/${id}`, createdAt: "2026-06-04T00:00:00.000Z" };
}

function workspace(id: string, projectId: string): Workspace {
  return { id, projectId, path: `/repo/${id}`, label: id, isMain: true, effectiveConfig: {} };
}

function session(id: string, targetWorkspace: Workspace): SessionInfo {
  return {
    id,
    cwd: targetWorkspace.path,
    path: `${targetWorkspace.path}/${id}.jsonl`,
    created: "2026-06-04T00:00:00.000Z",
    modified: "2026-06-04T00:00:00.000Z",
    messageCount: 1,
    firstMessage: "First message",
  };
}
