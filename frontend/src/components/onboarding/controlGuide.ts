import type { UserRole } from "@/types/auth";
import type { TourStep } from "@/config/tutorial";
import { getWorkflowTours } from "../../config/tutorialWorkflows";

export function controlDetails(role: UserRole, route: string, marker: string): TourStep[] {
  const workflows = getWorkflowTours(role);
  const names: Record<string, string> = { "create-event": "event-create", "add-task": "task-create", "task-card": "task-progress", "committee-create": "committees", "announcement-create": "announcements", "request-reject": "request-review", "admin-org-add": "organization-manage", "admin-member-edit": "user-manage", "ai-edit-task": "ai-review", "members-tab": "membership", "committees-tab": "committees", "announcements-tab": "announcements", "ai-tab": "ai-delegation" };
  const tour = workflows.find((item) => item.id === names[marker] && item.route === route);
  const opener = tour?.steps.findIndex((step) => step.target === marker) ?? -1;
  return tour && opener >= 0 ? tour.steps.slice(opener + 1).map((step) => ({ ...step, prepare: undefined })) : [];
}

export function describeControl(label: string, tag: string, type: string, role: string | null): string {
  if (tag === "input" && type === "file") return "Select a file that meets the attachment requirements. The guide never uploads files; close it before uploading your work.";
  if (tag === "input" && type === "checkbox") return "Select or clear this option. Review selected items before applying a bulk action or saving changes.";
  if (/search/i.test(label)) return "Enter a search term to narrow the records displayed. Clear the search to restore the list.";
  if (/filter|all (roles|organizations|committees|statuses|categories)|date range/i.test(label)) return "Select a filter to limit the records displayed. Choose All or Reset to remove that filter.";
  if (/cancel|^close$|^back$|^done$/i.test(label)) return "Close this view or return to the previous screen. Review any unsaved changes before leaving.";
  if (/save|submit|publish|approve|reject|delete|remove|archive|restore|send|sync|connect|disconnect|generate|auto.assign|auto.fix|mark.*read|confirm/i.test(label) || type === "submit") return "Review the selected item and any confirmation before proceeding. This action may save changes, send a notification, or update a connection. The guide explains it without activating it.";
  if (/grid|table|expanded|kanban|calendar|list view/i.test(label)) return "Choose how records are displayed: cards, lists, table rows, status columns, or calendar entries.";
  if (/previous|next|today|month|week|day|year/i.test(label)) return "Use these controls to change the page or calendar period. Check the page number or date range to confirm your location.";
  if (/view profile|view details|details|^edit|change role|reassign/i.test(label)) return "Open the selected item to review its details or editable fields. Changes take effect only after saving.";
  if (tag === "select" || role === "combobox" || role === "listbox") return "Select an available value for this field. Review the selection before saving; permissions or workflow requirements may limit the choices.";
  if (tag === "input" || tag === "textarea") return `${type === "number" ? "Enter a number" : type === "date" ? "Select a date" : "Enter a value"} for ${label.toLowerCase()}. Required fields and validation errors must be addressed before submitting.`;
  if (role === "tab" || /overview|members|committees|announcements|notifications|activity|nudges|ratings/i.test(label)) return "Open this section to review its information and actions. Available controls depend on your role and organization permissions.";
  return `Select ${label} to access its available options. Related workflow instructions are available in Help / User Guide.`;
}

export function collectPageControls(role: UserRole, route: string, scope?: Element | null): { steps: TourStep[]; cleanup: () => void } {
  const scopes = scope ? [scope] : [document.querySelector('[data-tour="workspace"]'), document.querySelector('header'), document.querySelector('aside'), ...document.querySelectorAll('dialog[open], [role="dialog"]')].filter(Boolean) as Element[];
  const candidates = new Set<HTMLElement>();
  for (const scope of scopes) for (const el of scope.querySelectorAll<HTMLElement>('button, a[href], input:not([type="hidden"]), select, textarea, summary, [role="tab"], [role="switch"], [role="checkbox"]')) candidates.add(el);
  const descriptions = new Map(getWorkflowTours(role).flatMap((tour) => tour.steps.map((step) => [step.target, step] as const)));
  const seen = new Set<string>();
  const records: { element: HTMLElement; previous: string | null }[] = [];
  const steps: TourStep[] = [];
  for (const element of candidates) {
    if (element.closest('[data-tour-help], [data-tour-dialog]')) continue;
    const rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height || getComputedStyle(element).visibility === "hidden" || rect.right <= 0 || rect.left >= window.innerWidth) continue;
    const linkedLabel = element.id ? Array.from(document.querySelectorAll('label')).find((label) => label.htmlFor === element.id)?.textContent : null;
    const labelBy = element.getAttribute("aria-labelledby")?.split(/\s+/).map((id) => document.getElementById(id)?.textContent ?? "").join(" ");
    const parentLabel = element.closest('label')?.textContent ?? element.parentElement?.querySelector('label')?.textContent;
    const marker = element.getAttribute('data-tour');
    const curated = marker ? descriptions.get(marker) : null;
    let label = (element.getAttribute('aria-label') || labelBy || element.getAttribute('title') || linkedLabel || parentLabel || element.getAttribute('placeholder') || curated?.title || element.textContent || "").replace(/\s+/g, " ").trim().slice(0, 120);
    const contextLabel = element.parentElement?.querySelector('label, h2, h3, h4, [class*="uppercase"]')?.textContent?.replace(/\s+/g, " ").trim();
    if (/^(edit|view|manage|change)$/i.test(label) && contextLabel) label = `${label}: ${contextLabel}`;
    if (!label) continue;
    if (steps.length >= 500) break;
    const tag = element.tagName.toLowerCase(), type = element.getAttribute('type') ?? "";
    const group = element.closest('form, section, nav')?.getAttribute('aria-label') ?? "";
    const repeatedRecordAction = marker && ["event-card", "task-card", "admin-org-card", "member-profile", "member-remove", "request-approve", "request-reject", "admin-member-edit"].includes(marker);
    const key = repeatedRecordAction ? `${tag}:${marker}:${group}` : `${tag}:${type}:${label}:${group}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const id = `control-${steps.length}`;
    records.push({ element, previous: element.getAttribute('data-tour-control') });
    element.setAttribute('data-tour-control', id);
    const disabled = element.matches(':disabled, [aria-disabled="true"]') ? " This control is unavailable until its requirements or permissions are met." : "";
    const title = curated && ["event-view", "event-status-filter"].includes(marker ?? "") ? `${curated.title}: ${label}` : curated?.title ?? label;
    const details = marker ? controlDetails(role, route, marker) : [];
    steps.push({ id, title, description: (curated?.description ?? describeControl(label, tag, type, element.getAttribute('role'))) + disabled,
      route, target: id, selector: `[data-tour-control="${id}"]`, openOnNext: details.length ? curated?.openOnNext : undefined });
    steps.push(...details.map((step) => ({ ...step, id: `${id}:${step.id}` })));
  }
  return { steps: steps.slice(0, 500), cleanup: () => { for (const { element, previous } of records) previous === null ? element.removeAttribute('data-tour-control') : element.setAttribute('data-tour-control', previous); } };
}
