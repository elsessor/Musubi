export type OpenedTutorialControl = { target: string; dirty: boolean };

export function rememberTutorialEdit(controls: OpenedTutorialControl[], event: Event, panel: HTMLElement | null) {
  if (!event.isTrusted || (event.target && panel?.contains(event.target as Node))) return;
  for (const control of controls) control.dirty = true;
}

export function closeUntouchedTutorialControls(controls: OpenedTutorialControl[], close: (target: string) => unknown) {
  for (const control of [...controls].reverse()) if (!control.dirty) close(control.target);
}
