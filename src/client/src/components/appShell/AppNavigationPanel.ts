import { LitElement, css, html } from "lit";
import { customElement, property, query } from "lit/decorators.js";
import type { Machine, MachineHealth, Project, SessionActivity, SessionInfo, SessionStatus, Workspace } from "../../api";
import type { MachineStatusSnapshot } from "../../../../shared/machineStatus";
import type { WorkspaceLabelItem } from "../../plugins/types";
import { selectedMachineId } from "../../controllers/types";
import type { NavigationSection } from "../../appShell/navigationState";
import { NAVIGATION_SECTION_ORDER } from "../../appShell/navigationState";
import type { KeyboardNavigableSection } from "../navigationFocus";
import "../MachineList";
import "../MachineSwitcher";
import "../ProjectList";
import "../WorkspaceList";
import "../SessionList";
import "../personalOs/ProjectSessionNavigation";
import type { ProjectSessionGroup } from "../../personalOs/projectSessionCatalog";

export type NavigationFocusTarget = NavigationSection | "chat";

@customElement("app-navigation-panel")
export class AppNavigationPanel extends LitElement {
  @property({ attribute: false }) machines: Machine[] = [];
  @property({ attribute: false }) selectedMachine?: Machine;
  @property({ attribute: false }) machineStatuses: Record<string, MachineHealth> = {};
  @property({ attribute: false }) machineStatusSnapshots: Record<string, MachineStatusSnapshot> = {};
  @property({ attribute: false }) projects: Project[] = [];
  @property({ attribute: false }) selectedProject?: Project;
  @property({ attribute: false }) workspaces: Workspace[] = [];
  @property({ attribute: false }) selectedWorkspace?: Workspace;
  @property({ attribute: false }) sessions: SessionInfo[] = [];
  @property({ attribute: false }) selectedSession?: SessionInfo;
  @property({ attribute: false }) sessionActivities: Record<string, SessionActivity> = {};
  @property({ attribute: false }) sessionStatuses: Record<string, SessionStatus> = {};
  @property({ attribute: false }) sendingPrompts: Record<string, true> = {};
  @property({ attribute: false }) unreadSessionIds: ReadonlySet<string> = new Set();
  @property({ attribute: false }) deletingWorkspaceIds: string[] = [];
  @property({ attribute: false }) workspaceLabelItems: (workspace: Workspace) => WorkspaceLabelItem[] = () => [];
  @property({ attribute: false }) refreshControl: unknown;
  @property({ attribute: false }) projectSessionGroups: ProjectSessionGroup[] = [];
  @property({ attribute: false }) projectSessionUnreadIds: ReadonlySet<string> = new Set();
  @property({ type: Boolean }) projectSessionsLoading = false;
  @property({ type: Boolean, reflect: true }) collapsible = false;
  @property({ type: Boolean, reflect: true }) compact = false;
  @property({ type: Boolean }) machinesCollapsed = false;
  @property({ type: Boolean }) projectsCollapsed = false;
  @property({ type: Boolean }) workspacesCollapsed = false;
  @property({ type: Boolean }) sessionsCollapsed = false;
  @property({ type: Number }) startingSessionCount = 0;
  @property({ type: Boolean }) canStartSession = false;
  @property({ attribute: false }) onShowActions?: () => void;
  @property({ attribute: false }) onSelectPrimaryProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onSelectPrimarySession?: (workspace: Workspace, session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onStartPrimarySession?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onAddProject?: () => void | Promise<void>;
  @property({ attribute: false }) onToggleMachines?: () => void;
  @property({ attribute: false }) onToggleProjects?: () => void;
  @property({ attribute: false }) onToggleWorkspaces?: () => void;
  @property({ attribute: false }) onToggleSessions?: () => void;
  @property({ attribute: false }) onSelectProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onCloseProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onSelectWorkspace?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onDeleteWorkspace?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onStartSession?: () => void | Promise<void>;
  @property({ attribute: false }) onSelectSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSessionWithDescendants?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onArchiveSessions?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onRestoreSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteCachedNewSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteArchivedSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onDeleteArchivedSessions?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onDetachParentSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onMarkSessionRead?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onMarkSessionsRead?: (sessions: SessionInfo[]) => void | Promise<void>;
  @property({ attribute: false }) onReloadSession?: (session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onCleanupSessions?: () => void | Promise<void>;
  @property({ attribute: false }) onArchivedCollapsed?: () => void | Promise<void>;
  @property({ attribute: false }) onSelectMachine?: (machine: Machine) => void | Promise<void>;
  @property({ attribute: false }) onRemoveMachine?: (machine: Machine) => void | Promise<void>;
  @property({ attribute: false }) onFocusNavigationTarget?: (target: NavigationFocusTarget) => void | Promise<void>;
  @property({ attribute: false }) onCancelKeyboardNavigation?: () => void | Promise<void>;

  @query("machine-list") private machineList?: KeyboardNavigableSection;
  @query("machine-switcher") private machineSwitcher?: KeyboardNavigableSection;
  @query("project-list") private projectList?: KeyboardNavigableSection;
  @query("workspace-list") private workspaceList?: KeyboardNavigableSection;
  @query("session-list") private sessionList?: KeyboardNavigableSection;
  @query("details.runtime-browser") private runtimeBrowser?: HTMLDetailsElement;

  async focusSection(section: NavigationSection): Promise<boolean> {
    this.openRuntimeBrowser();
    await this.updateComplete;
    switch (section) {
      case "machines": return await this.focusNavigableSection(this.compact ? this.machineList : this.machineSwitcher);
      case "projects": return await this.focusNavigableSection(this.projectList);
      case "workspaces": return await this.focusNavigableSection(this.workspaceList);
      case "sessions": return await this.focusNavigableSection(this.sessionList);
    }
  }

  override render() {
    return html`
      <project-session-navigation
        .projects=${this.projects}
        .selectedProject=${this.selectedProject}
        .groups=${this.projectSessionGroups}
        .selectedWorkspace=${this.selectedWorkspace}
        .selectedSession=${this.selectedSession}
        .statuses=${this.sessionStatuses}
        .activities=${this.sessionActivities}
        .sendingPrompts=${this.sendingPrompts}
        .unreadSessionIds=${this.projectSessionUnreadIds}
        .loading=${this.projectSessionsLoading}
        .refreshControl=${this.refreshControl}
        .onSelectProject=${this.onSelectPrimaryProject ?? this.onSelectProject}
        .onSelectSession=${this.onSelectPrimarySession}
        .onStartSession=${this.onStartPrimarySession}
        .onAddProject=${this.onAddProject}
        .onBrowseRuntime=${() => { this.toggleRuntimeBrowser(); }}
        .onShowActions=${this.onShowActions}
      ></project-session-navigation>
      <header class="legacy-header hidden">
        <strong>AGENT CONSOLE</strong>
        ${shouldShowMachinesSection(this.machines) ? html`
          <machine-switcher
            .machines=${this.machines}
            .selected=${this.selectedMachine}
            .statuses=${this.machineStatuses}
            .statusSnapshots=${this.machineStatusSnapshots}
            .onSelect=${(machine: Machine) => this.onSelectMachine?.(machine)}
            .onRemove=${(machine: Machine) => this.onRemoveMachine?.(machine)}
            .onFocusNextSection=${() => { this.focusNextFrom("machines"); }}
            .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
          ></machine-switcher>
        ` : null}
        <div class="header-actions">
          ${this.refreshControl}
          <button title="Show Actions" aria-label="Show Actions" @click=${() => { this.onShowActions?.(); }}>Actions</button>
        </div>
      </header>
      <details class="runtime-browser">
        <summary aria-label="Close runtime browser"></summary>
        <div class="runtime-sections">
      ${this.compact && shouldShowMachinesSection(this.machines) ? html`
        <machine-list
          .machines=${this.machines}
          .selected=${this.selectedMachine}
          .statuses=${this.machineStatuses}
          .statusSnapshots=${this.machineStatusSnapshots}
          .collapsible=${this.collapsible}
          .collapsed=${this.machinesCollapsed}
          .onToggleCollapsed=${() => { this.onToggleMachines?.(); }}
          .onSelect=${(machine: Machine) => this.onSelectMachine?.(machine)}
          .onRemove=${(machine: Machine) => this.onRemoveMachine?.(machine)}
          .onFocusNextSection=${() => { this.focusNextFrom("machines"); }}
          .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
        ></machine-list>
      ` : null}
      <project-list
        .projects=${this.projects}
        .selected=${this.selectedProject}
        .statusSnapshot=${this.selectedMachineStatusSnapshot()}
        .collapsible=${this.collapsible}
        .collapsed=${this.projectsCollapsed}
        .onToggleCollapsed=${() => { this.onToggleProjects?.(); }}
        .onSelect=${(project: Project) => this.onSelectProject?.(project)}
        .onClose=${(project: Project) => this.onCloseProject?.(project)}
        .onFocusPreviousSection=${() => { this.focusPreviousFrom("projects"); }}
        .onFocusNextSection=${() => { this.focusNextFrom("projects"); }}
        .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
      ></project-list>
      <workspace-list
        .workspaces=${this.workspaces}
        .selected=${this.selectedWorkspace}
        .statusSnapshot=${this.selectedMachineStatusSnapshot()}
        .deletingWorkspaceIds=${this.deletingWorkspaceIds}
        .collapsible=${this.collapsible}
        .collapsed=${this.workspacesCollapsed}
        .workspaceLabelItems=${this.workspaceLabelItems}
        .onToggleCollapsed=${() => { this.onToggleWorkspaces?.(); }}
        .onSelect=${(workspace: Workspace) => this.onSelectWorkspace?.(workspace)}
        .onDelete=${(workspace: Workspace) => this.onDeleteWorkspace?.(workspace)}
        .onFocusPreviousSection=${() => { this.focusPreviousFrom("workspaces"); }}
        .onFocusNextSection=${() => { this.focusNextFrom("workspaces"); }}
        .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
      ></workspace-list>
      <session-list
        .sessions=${this.sessions}
        .statuses=${this.sessionStatuses}
        .activities=${this.sessionActivities}
        .sending=${this.sendingPrompts}
        .unreadSessionIds=${this.unreadSessionIds}
        .selected=${this.selectedSession}
        .startingCount=${this.startingSessionCount}
        .canStart=${this.canStartSession}
        .collapsible=${this.collapsible}
        .collapsed=${this.sessionsCollapsed}
        .onToggleCollapsed=${() => { this.onToggleSessions?.(); }}
        .onArchivedCollapsed=${() => this.onArchivedCollapsed?.()}
        .onStart=${() => this.onStartSession?.()}
        .onSelect=${(session: SessionInfo) => this.onSelectSession?.(session)}
        .onArchive=${(session: SessionInfo) => this.onArchiveSession?.(session)}
        .onArchiveWithDescendants=${(session: SessionInfo) => this.onArchiveSessionWithDescendants?.(session)}
        .onArchiveMany=${(sessions: SessionInfo[]) => this.onArchiveSessions?.(sessions)}
        .onRestore=${(session: SessionInfo) => this.onRestoreSession?.(session)}
        .onDelete=${(session: SessionInfo) => this.onDeleteCachedNewSession?.(session)}
        .onDeleteArchived=${(session: SessionInfo) => this.onDeleteArchivedSession?.(session)}
        .onDeleteArchivedMany=${(sessions: SessionInfo[]) => this.onDeleteArchivedSessions?.(sessions)}
        .onDetachParent=${(session: SessionInfo) => this.onDetachParentSession?.(session)}
        .onMarkRead=${(session: SessionInfo) => this.onMarkSessionRead?.(session)}
        .onMarkReadMany=${(sessions: SessionInfo[]) => this.onMarkSessionsRead?.(sessions)}
        .onReload=${(session: SessionInfo) => this.onReloadSession?.(session)}
        .onCleanup=${() => this.onCleanupSessions?.()}
        .onFocusPreviousSection=${() => { this.focusPreviousFrom("sessions"); }}
        .onFocusNextSection=${() => { this.focusNextFrom("sessions"); }}
        .onCancelKeyboardNavigation=${() => { this.cancelKeyboardNavigation(); }}
      ></session-list>
        </div>
      </details>
    `;
  }

  private openRuntimeBrowser(): void {
    if (this.runtimeBrowser !== undefined) this.runtimeBrowser.open = true;
  }

  private toggleRuntimeBrowser(): void {
    if (this.runtimeBrowser !== undefined) this.runtimeBrowser.open = !this.runtimeBrowser.open;
  }

  /**
   * Project and workspace rows always belong to the selected machine, resolved
   * exactly as the rest of the app resolves it — including its local-machine
   * default, which is the key snapshots arrive under before a machine has been
   * selected. Diverging here would blank every row's indicator while a snapshot
   * is in fact loaded.
   */
  private selectedMachineStatusSnapshot(): MachineStatusSnapshot | undefined {
    return this.machineStatusSnapshots[selectedMachineId({ selectedMachine: this.selectedMachine })];
  }

  private async focusNavigableSection(section: KeyboardNavigableSection | undefined): Promise<boolean> {
    if (section === undefined) return false;
    return await section.focusSelectedOrFirst();
  }

  private focusPreviousFrom(section: NavigationSection): void {
    const target = previousVisibleNavigationTarget(section, this.machines);
    if (target !== undefined) void this.onFocusNavigationTarget?.(target);
  }

  private focusNextFrom(section: NavigationSection): void {
    void this.onFocusNavigationTarget?.(nextVisibleNavigationTarget(section, this.machines));
  }

  private cancelKeyboardNavigation(): void {
    void this.onCancelKeyboardNavigation?.();
  }

  static override styles = css`
    :host { display: flex; flex-direction: column; min-height: 0; overflow: hidden; }
    :host([compact]) { flex: 1 1 auto; }
    project-session-navigation { flex: 1 1 auto; min-height: 180px; }
    .legacy-header { flex: 0 0 auto; display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 12px; border-bottom: 1px solid var(--pi-border); }
    .legacy-header.hidden { display: none; }
    .legacy-header strong { flex: 0 0 auto; }
    machine-switcher { flex: 1 1 auto; min-width: 0; }
    :host([compact]) .legacy-header { display: none; }
    .header-actions { flex: 0 0 auto; display: flex; align-items: center; gap: 8px; }
    .runtime-browser { display: none; flex: 0 0 auto; min-height: 0; border-top: 1px solid var(--pi-border); background: var(--pi-bg); }
    .runtime-browser[open] { flex: 1 1 50%; display: flex; flex-direction: column; }
    .runtime-browser > summary { display: none; }
    .runtime-sections { flex: 1 1 auto; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    /* Expanded sections share the runtime browser height equally, so
       collapsing one distributes its space to the remaining sections. */
    .runtime-sections machine-list,
    .runtime-sections project-list,
    .runtime-sections workspace-list,
    .runtime-sections session-list { flex: 1 1 0px; min-height: 0; overflow: hidden; border-bottom: 1px solid var(--pi-border-muted); }
    .runtime-sections machine-list[collapsed],
    .runtime-sections project-list[collapsed],
    .runtime-sections workspace-list[collapsed],
    .runtime-sections session-list[collapsed] { flex: 0 0 auto; min-height: auto; overflow: hidden; }
    button { border: 1px solid var(--pi-border); border-radius: 8px; background: var(--pi-surface); color: var(--pi-text); padding: 7px 9px; cursor: pointer; }
  `;
}

export function shouldShowMachinesSection(machines: readonly Machine[]): boolean {
  return machines.length > 1;
}

function previousVisibleNavigationTarget(section: NavigationSection, machines: readonly Machine[]): NavigationSection | undefined {
  const sections = visibleNavigationSections(machines);
  return sections[sections.indexOf(section) - 1];
}

function nextVisibleNavigationTarget(section: NavigationSection, machines: readonly Machine[]): NavigationFocusTarget {
  const sections = visibleNavigationSections(machines);
  return sections[sections.indexOf(section) + 1] ?? "chat";
}

function visibleNavigationSections(machines: readonly Machine[]): NavigationSection[] {
  return NAVIGATION_SECTION_ORDER.filter((section) => section !== "machines" || shouldShowMachinesSection(machines));
}
