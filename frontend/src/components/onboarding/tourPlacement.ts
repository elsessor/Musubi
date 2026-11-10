type Rect = { x: number; y: number; width: number; height: number };
type Viewport = { width: number; height: number; offsetLeft?: number; offsetTop?: number };

export function getTourPanelPosition({ viewport, panel, target, expanded = false, statusDialog = false }: {
  viewport: Viewport;
  panel: { width: number; height: number };
  target: Rect | null;
  expanded?: boolean;
  statusDialog?: boolean;
}) {
  const { width: vw, height: vh, offsetLeft: originX = 0, offsetTop: originY = 0 } = viewport;
  const compact = vw < 640;
  const margin = compact ? 16 : 24;
  const maxWidth = Math.max(0, vw - margin * 2);
  const maxHeight = Math.max(0, Math.min(vh - margin * 2, compact ? Math.max(200, vh * (expanded && !statusDialog ? 0.72 : 0.48)) : vh));
  const width = Math.min(panel.width, maxWidth), height = Math.min(panel.height, maxHeight);
  const minLeft = originX + margin, minTop = originY + margin;
  const maxLeft = Math.max(minLeft, originX + vw - width - margin), maxTop = Math.max(minTop, originY + vh - height - margin);
  let left = originX + (vw - width) / 2, top = originY + (vh - height) / 2;

  if (compact) {
    // Keep the header and navigation in the visible viewport, including while
    // mobile browser controls or the on-screen keyboard change its height.
    top = maxTop;
  } else if (target && statusDialog) {
    left = target.x + target.width + 16;
  } else if (target) {
    if (target.x + target.width + width + 16 <= originX + vw - margin) { left = target.x + target.width + 16; top = target.y; }
    else if (target.y + target.height + height + 16 <= originY + vh - margin) { left = target.x; top = target.y + target.height + 16; }
    else if (target.y - height - 16 >= minTop) { left = target.x; top = target.y - height - 16; }
    else if (target.x - width - 16 >= minLeft) { left = target.x - width - 16; top = target.y; }
  }

  return { left: Math.max(minLeft, Math.min(left, maxLeft)), top: Math.max(minTop, Math.min(top, maxTop)), maxHeight, maxWidth };
}
