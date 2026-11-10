import { LitElement, css, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { Project, SessionActivity, SessionInfo, SessionStatus, Workspace } from "../../api";
import { isSessionActive } from "../../../../shared/activity";
import { dispatchProjectIcon } from "../../personalOs/dispatchPresentation";
import type { ProjectSessionGroup } from "../../personalOs/projectSessionCatalog";

export type { ProjectSessionGroup } from "../../personalOs/projectSessionCatalog";

@customElement("project-session-navigation")
export class ProjectSessionNavigation extends LitElement {
  @property({ attribute: false }) projects: Project[] = [];
  @property({ attribute: false }) selectedProject?: Project;
  @property({ attribute: false }) groups: ProjectSessionGroup[] = [];
  @property({ attribute: false }) selectedWorkspace?: Workspace;
  @property({ attribute: false }) selectedSession?: SessionInfo;
  @property({ attribute: false }) statuses: Record<string, SessionStatus> = {};
  @property({ attribute: false }) activities: Record<string, SessionActivity> = {};
  @property({ attribute: false }) sendingPrompts: Record<string, true> = {};
  @property({ attribute: false }) unreadSessionIds: ReadonlySet<string> = new Set();
  @property({ type: Boolean }) loading = false;
  @property({ attribute: false }) refreshControl: unknown;
  @property({ attribute: false }) onSelectProject?: (project: Project) => void | Promise<void>;
  @property({ attribute: false }) onSelectSession?: (workspace: Workspace, session: SessionInfo) => void | Promise<void>;
  @property({ attribute: false }) onStartSession?: (workspace: Workspace) => void | Promise<void>;
  @property({ attribute: false }) onAddProject?: () => void | Promise<void>;
  @property({ attribute: false }) onBrowseRuntime?: () => void | Promise<void>;
  @property({ attribute: false }) onShowActions?: () => void | Promise<void>;

  override render() {
    return html`
      <nav aria-label="Dispatch">
        <div class="project-bar">
          ${this.renderProjectPicker()}
          ${this.renderMenu()}
        </div>
        <div class="chat-list" aria-label="Chats" aria-busy=${String(this.loading)}>
          ${this.renderChatContent()}
        </div>
        <div class="destinations">
          <div class="destination scheduled" aria-disabled="true" title="Scheduled tasks are not configured yet">
            <span class="destination-icon" aria-hidden="true">◷</span>
            <span>Scheduled</span>
            <small>soon</small>
          </div>
        </div>
      </nav>
    `;
  }

  private renderProjectPicker() {
    const selected = this.selectedProject;
    return html`
      <details class="project-picker">
        <summary aria-label=${selected === undefined ? "Choose Project" : `Project: ${selected.name}`}>
          <span class="project-icon" aria-hidden="true">${selected === undefined ? "◆" : dispatchProjectIcon(selected)}</span>
          <span class="project-name">${selected?.name ?? "Choose Project"}</span>
          <span class="chevron" aria-hidden="true">⌄</span>
        </summary>
        <div class="project-menu" role="menu">
          ${this.projects.length === 0
            ? html`<p class="menu-empty">No Projects yet</p>`
            : this.projects.map((project) => html`
              <button
                type="button"
                role="menuitemradio"
                aria-checked=${String(project.id === selected?.id)}
                @click=${(event: Event) => { this.selectProject(event, project); }}
              >
                <span aria-hidden="true">${dispatchProjectIcon(project)}</span>
                <span>${project.name}</span>
              </button>
            `)}
        </div>
      </details>
    `;
  }

  private renderChatContent() {
    if (this.selectedProject === undefined) return html`<p class="empty">Choose a Project to see its Chats</p>`;
    const defaultWorkspace = this.defaultWorkspace();
    return html`
      <button type="button" class="new-chat" ?disabled=${defaultWorkspace === undefined || this.onStartSession === undefined} @click=${() => { if (defaultWorkspace !== undefined) void this.onStartSession?.(defaultWorkspace); }}>
        <span class="chat-glyph" aria-hidden="true">+</span>
        <span>New chat</span>
      </button>
      ${this.loading && this.groups.length === 0
        ? html`<p class="empty" role="status">Loading Chats…</p>`
        : this.renderSessions()}
    `;
  }

  private renderSessions() {
    if (this.groups.length === 0) return html`<p class="empty">No Chats yet</p>`;
    const hasSessions = this.groups.some((group) => group.sessions.length > 0);
    return html`
      ${this.groups.map((group) => html`
        ${group.error === undefined ? null : html`<p class="group-error" role="status"><span aria-hidden="true">!</span>${group.workspace.label}: ${group.error}</p>`}
        ${group.sessions.map((session) => this.renderSession(group.workspace, session))}
      `)}
      ${hasSessions ? null : html`<p class="empty">No Chats yet</p>`}
    `;
  }

  private renderSession(workspace: Workspace, session: SessionInfo) {
    const selected = session.id === this.selectedSession?.id && workspace.id === this.selectedWorkspace?.id;
    const unread = this.unreadSessionIds.has(session.id);
    const working = isSessionActive(this.statuses[session.id], this.activities[session.id]);
    const sending = this.sendingPrompts[session.id] === true;
    const state = sending ? "sending" : working ? "working" : unread ? "unread" : session.archived === true ? "archived" : "idle";
    const summary = sessionSummary(session);
    return html`
      <button
        type="button"
        class=${`chat-row${selected ? " selected" : ""}${session.archived === true ? " archived" : ""}`}
        aria-current=${selected ? "page" : "false"}
        aria-label=${`${sessionLabel(session)}, ${workspace.label}, ${state}`}
        title=${session.path}
        @click=${() => this.onSelectSession?.(workspace, session)}
      >
        <span class=${`chat-glyph ${state}`} aria-hidden="true"></span>
        <span class="row-copy">
          <strong>${sessionLabel(session)}</strong>
          ${summary === "" ? null : html`<small class="session-summary" dir="auto" title=${summary}>${summary}</small>`}
        </span>
      </button>
    `;
  }

  private renderMenu() {
    return html`
      <details class="navigation-menu">
        <summary title="Dispatch menu" aria-label="Dispatch menu">
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 7h16M4 12h16M4 17h16"></path></svg>
        </summary>
        <div class="menu-panel">
          <button type="button" @click=${(event: Event) => { this.runMenuAction(event, this.onShowActions); }} ?disabled=${this.onShowActions === undefined}><span aria-hidden="true">⌘</span>Actions</button>
          ${this.refreshControl === undefined ? null : html`<div class="refresh-action" @click=${(event: Event) => { this.closeDetails(event); }}>${this.refreshControl}</div>`}
          <button type="button" @click=${(event: Event) => { this.runMenuAction(event, this.onAddProject); }} ?disabled=${this.onAddProject === undefined}><span aria-hidden="true">+</span>Add Project</button>
          <button type="button" @click=${(event: Event) => { this.runMenuAction(event, this.onBrowseRuntime); }} ?disabled=${this.onBrowseRuntime === undefined}><span aria-hidden="true">◇</span>Runtime browser</button>
          ${this.groups.length === 0 ? null : html`
            <div class="menu-separator" role="separator"></div>
            <span class="menu-label">New Chat in</span>
            ${this.groups.map((group) => html`
              <button type="button" @click=${(event: Event) => { this.runMenuAction(event, () => this.onStartSession?.(group.workspace)); }} ?disabled=${this.onStartSession === undefined}>
                <span aria-hidden="true">${group.workspace.isMain ? "⌂" : "⑂"}</span>${group.workspace.label}
              </button>
            `)}
          `}
        </div>
      </details>
    `;
  }

  private defaultWorkspace(): Workspace | undefined {
    const selected = this.selectedWorkspace;
    if (selected !== undefined && selected.projectId === this.selectedProject?.id) return selected;
    return this.groups.find((group) => group.workspace.isMain)?.workspace ?? this.groups[0]?.workspace;
  }

  private selectProject(event: Event, project: Project): void {
    this.closeDetails(event);
    void this.onSelectProject?.(project);
  }

  private runMenuAction(event: Event, action: (() => void | Promise<void>) | undefined): void {
    this.closeDetails(event);
    void action?.();
  }

  private closeDetails(event: Event): void {
    const details = event.currentTarget instanceof Element ? event.currentTarget.closest("details") : null;
    if (details instanceof HTMLDetailsElement) details.open = false;
  }

  static override styles = css`
    :host { flex: 1 1 auto; min-width: 0; min-height: 0; display: block; overflow: hidden; color: var(--pi-text); background: var(--pi-bg); font: 12px/1.35 var(--pi-font-family, "Departure Mono", ui-monospace, monospace); }
    nav { height: 100%; min-height: 0; display: flex; flex-direction: column; overflow: hidden; }
    button, summary { font: inherit; }
    .project-bar { position: relative; z-index: 12; flex: 0 0 auto; display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 4px; min-height: 48px; padding: 5px 6px; border-bottom: 1px solid var(--pi-border-muted); }
    details > summary { list-style: none; }
    details > summary::-webkit-details-marker { display: none; }
    .project-picker { min-width: 0; }
    .project-picker > summary { min-width: 0; display: grid; grid-template-columns: 24px minmax(0, 1fr) 14px; align-items: center; gap: 7px; padding: 7px 6px; color: var(--pi-text-bright); cursor: pointer; }
    .project-picker > summary:hover, .project-picker[open] > summary { background: var(--pi-surface-hover); }
    .project-icon { display: grid; place-items: center; width: 24px; height: 24px; color: var(--pi-accent); font-size: 14px; }
    .project-name { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .chevron { color: var(--pi-muted); }
    .project-menu, .menu-panel { position: absolute; top: calc(100% + 1px); box-sizing: border-box; max-height: min(440px, calc(100vh - 70px)); overflow: auto; padding: 5px; border: 1px solid var(--pi-border); background: var(--pi-bg-overlay); box-shadow: 0 16px 36px var(--pi-shadow-strong); backdrop-filter: blur(12px); }
    .project-menu { left: 6px; right: 42px; min-width: 180px; }
    .project-menu button, .menu-panel button { width: 100%; display: grid; grid-template-columns: 24px minmax(0, 1fr); align-items: center; gap: 7px; border: 0; border-radius: 0; background: transparent; color: var(--pi-text); padding: 8px 7px; text-align: left; cursor: pointer; }
    .project-menu button:hover, .menu-panel button:hover:not(:disabled) { background: var(--pi-surface-hover); }
    .project-menu button[aria-checked="true"] { color: var(--pi-accent); }
    .menu-empty { margin: 7px; color: var(--pi-muted); }
    .navigation-menu > summary { box-sizing: border-box; width: 34px; height: 34px; display: grid; place-items: center; border: 0; background: transparent; color: var(--pi-muted); cursor: pointer; }
    .navigation-menu > summary:hover, .navigation-menu[open] > summary { background: var(--pi-surface-hover); color: var(--pi-accent); }
    .navigation-menu svg { width: 15px; height: 15px; fill: none; stroke: currentColor; stroke-width: 1.6; stroke-linecap: round; }
    .menu-panel { right: 6px; width: min(230px, calc(100vw - 18px)); }
    .menu-panel button:disabled { color: var(--pi-dim); cursor: not-allowed; }
    .refresh-action { display: contents; }
    .menu-separator { height: 1px; margin: 4px 3px; background: var(--pi-border-muted); }
    .menu-label { display: block; padding: 6px 8px 3px; color: var(--pi-muted); font-size: 9px; text-transform: uppercase; letter-spacing: .08em; }
    .chat-list { flex: 1 1 auto; min-height: 0; overflow: auto; padding: 6px; scrollbar-width: thin; }
    .new-chat, .chat-row { box-sizing: border-box; width: 100%; min-width: 0; border: 0; border-radius: 0; background: transparent; color: var(--pi-text-secondary); padding: 9px 8px; text-align: left; cursor: pointer; }
    .new-chat { display: grid; grid-template-columns: 16px minmax(0, 1fr); align-items: center; gap: 8px; margin-bottom: 5px; color: var(--pi-accent); }
    .chat-row { position: relative; display: block; padding: 10px 10px 11px; }
    .new-chat:hover:not(:disabled), .chat-row:hover { background: var(--pi-surface-hover); color: var(--pi-text-bright); }
    .new-chat:disabled { color: var(--pi-dim); cursor: not-allowed; }
    .chat-row.selected { box-shadow: inset 2px 0 var(--pi-accent); background: color-mix(in srgb, var(--pi-selection-bg) 52%, transparent); color: var(--pi-text-bright); }
    .chat-row:focus-visible, .new-chat:focus-visible, summary:focus-visible, .project-menu button:focus-visible, .menu-panel button:focus-visible { outline: 1px solid var(--pi-accent); outline-offset: -1px; }
    .new-chat .chat-glyph { color: var(--pi-dim); text-align: center; }
    .chat-row > .chat-glyph { position: absolute; top: 13px; right: 10px; display: none; width: 6px; height: 6px; border-radius: 50%; pointer-events: none; }
    .chat-row > .chat-glyph.working, .chat-row > .chat-glyph.sending { display: block; background: var(--pi-success); box-shadow: 0 0 0 2px color-mix(in srgb, var(--pi-success) 18%, transparent); animation: pulse 1s ease-in-out infinite; }
    .chat-row > .chat-glyph.unread { display: block; background: var(--pi-accent); }
    .row-copy { min-width: 0; display: grid; gap: 5px; }
    .row-copy strong { box-sizing: border-box; overflow: hidden; padding-right: 16px; font-size: 12px; font-weight: 400; text-overflow: ellipsis; text-transform: uppercase; white-space: nowrap; }
    .session-summary { display: -webkit-box; overflow: hidden; color: var(--pi-muted); font-size: 10px; line-height: 1.55; white-space: normal; overflow-wrap: anywhere; -webkit-box-orient: vertical; -webkit-line-clamp: 3; }
    .chat-row.archived { opacity: .58; }
    .empty, .group-error { margin: 12px 8px; color: var(--pi-muted); font-size: 10px; line-height: 1.5; }
    .group-error { color: var(--pi-danger); }
    .group-error span { margin-right: 7px; }
    .destinations { flex: 0 0 auto; padding: 5px 6px 8px; border-top: 1px solid var(--pi-border-muted); }
    .destination { display: grid; grid-template-columns: 18px minmax(0, 1fr) auto; align-items: center; gap: 7px; padding: 9px 8px; color: var(--pi-muted); }
    .destination[aria-disabled="true"] { opacity: .7; }
    .destination-icon { color: var(--pi-accent); text-align: center; }
    .destination small { color: var(--pi-dim); font-size: 8px; text-transform: uppercase; }
    @keyframes pulse { 0%, 100% { transform: scale(.75); opacity: .55; } 50% { transform: scale(1.15); opacity: 1; } }
  `;
}

function sessionSummary(session: SessionInfo): string {
  return session.firstMessage.replace(/\s+/g, " ").trim();
}

function sessionLabel(session: SessionInfo): string {
  if (session.name !== undefined && session.name.trim() !== "") return session.name;
  if (session.firstMessage.trim() !== "") return session.firstMessage;
  return session.id.slice(0, 8);
}
