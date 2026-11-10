import { LitElement, html } from "lit";
import { customElement, property } from "lit/decorators.js";
import type { SessionStatus } from "../api";
import { thinkingLevelLabel } from "../../../shared/thinkingLevels";
import { formatTokenCount } from "../utils/format";
import { renderSessionWarningIcon, statusBarStyles } from "./shared";

export function statusBarContextLimit(context: SessionStatus["contextUsage"]): string | undefined {
  if (context === undefined) return undefined;
  if (context.percent === null) return `context ${formatTokenCount(context.contextWindow)}`;
  return `context ${context.percent.toFixed(1)}% / ${formatTokenCount(context.contextWindow)}`;
}

export interface StatusBarWarningControlContent {
  countText: string;
  accessibleLabel: string;
}

export function statusBarWarningControlContent(count: number, expanded: boolean): StatusBarWarningControlContent | undefined {
  if (!Number.isInteger(count) || count <= 0) return undefined;
  const warningText = `${String(count)} ${count === 1 ? "warning" : "warnings"}`;
  return {
    countText: String(count),
    accessibleLabel: expanded ? `Minimise ${warningText}` : `Show ${warningText} in the warning area`,
  };
}

@customElement("status-bar")
export class StatusBar extends LitElement {
  @property({ attribute: false }) status?: SessionStatus;
  @property({ type: Number }) warningCount = 0;
  @property({ type: Boolean }) warningsExpanded = false;
  @property({ attribute: false }) onToggleWarnings?: () => void;
  @property({ attribute: false }) onSelectModel?: () => void;
  @property({ attribute: false }) onSelectThinking?: () => void;

  private readonly handleToggleWarnings = (): void => {
    this.onToggleWarnings?.();
  };

  override render() {
    const status = this.status;
    if (status === undefined) return html`<div class="bar muted">No session status yet</div>`;
    const model = status.model?.id ?? "no model";
    const thinking = thinkingLevelLabel(status.thinkingLevel);
    const contextLimit = statusBarContextLimit(status.contextUsage);
    const warningControl = statusBarWarningControlContent(this.warningCount, this.warningsExpanded);
    return html`
      <div class="bar">
        ${warningControl === undefined || this.onToggleWarnings === undefined ? null : html`
          <button
            type="button"
            class="warning-toggle"
            title=${warningControl.accessibleLabel}
            aria-label=${warningControl.accessibleLabel}
            aria-expanded=${String(this.warningsExpanded)}
            @click=${this.handleToggleWarnings}
          >
            ${renderSessionWarningIcon("warning", "warning-toggle-icon")}
            <span>${warningControl.countText}</span>
          </button>
        `}
        <button type="button" class="status-control model-control" title="Select model" aria-label=${`Current model: ${model}. Select model`} @click=${() => this.onSelectModel?.()}>${model}</button>
        <button type="button" class="status-control reasoning-control" title=${`Select thinking level: ${thinking}`} aria-label=${`Current thinking level: ${thinking}. Select thinking level`} @click=${() => this.onSelectThinking?.()}>${thinking}</button>
        ${contextLimit === undefined ? null : html`<span class="usage-limit">${contextLimit}</span>`}
        ${status.pendingMessageCount > 0 ? html`<span>${String(status.pendingMessageCount)} queued</span>` : null}
      </div>
    `;
  }

  static override styles = statusBarStyles;
}
