import assert from "node:assert/strict";
import test from "node:test";
import { getTourPanelPosition } from "../../frontend/src/components/onboarding/tourPlacement.js";

test("phone guides stay at the visible bottom edge even when a large highlight fills the page", () => {
  for (const [width, height] of [[320, 568], [375, 640], [390, 844], [430, 740]]) {
    const panel = { width: 320, height: 260 };
    const result = getTourPanelPosition({ viewport: { width, height }, panel, target: { x: 8, y: 275, width: width - 16, height: 460 } });
    const renderedHeight = Math.min(panel.height, result.maxHeight);
    assert.equal(result.top + renderedHeight, height - 16);
    assert.ok(result.top >= 16);
    assert.ok(result.left >= 16 && result.left + Math.min(panel.width, result.maxWidth) <= width - 16);
  }
});

test("browser chrome, zoom offsets, and keyboard resizing keep the header and navigation on screen", () => {
  for (const height of [650, 440, 280, 220, 650]) for (const expanded of [false, true]) {
    const viewport = { width: 360, height, offsetLeft: 12, offsetTop: 78 };
    const panel = { width: 320, height: expanded ? 800 : 350 };
    const result = getTourPanelPosition({ viewport, panel, target: null, expanded });
    assert.ok(result.left >= viewport.offsetLeft + 16);
    assert.ok(result.top >= viewport.offsetTop + 16);
    assert.equal(result.top + Math.min(panel.height, result.maxHeight), viewport.offsetTop + height - 16);
    assert.ok(result.maxHeight <= height - 32);
  }
});

test("expanded phone references scroll within the guide while status forms retain their own space", () => {
  const options = { viewport: { width: 390, height: 844 }, panel: { width: 320, height: 900 }, target: null, expanded: true };
  const reference = getTourPanelPosition(options);
  const status = getTourPanelPosition({ ...options, statusDialog: true });
  assert.ok(reference.maxHeight > status.maxHeight);
  assert.ok(reference.top >= 16 && status.top >= 16);
  assert.equal(status.top + status.maxHeight, 828);
});

test("desktop guides stay beside their targets and status walkthroughs keep the centered pair layout", () => {
  const viewport = { width: 1904, height: 952 };
  const panel = { width: 448, height: 340 };
  const target = { x: 491, y: 60, width: 458, height: 834 };
  const result = getTourPanelPosition({ viewport, panel, target, statusDialog: true });
  assert.equal(result.left, target.x + target.width + 16);
  assert.equal(result.top, (viewport.height - panel.height) / 2);
  const ordinary = getTourPanelPosition({ viewport, panel, target: { x: 100, y: 200, width: 150, height: 50 } });
  assert.equal(ordinary.left, 266);
  assert.equal(ordinary.top, 200);
});
