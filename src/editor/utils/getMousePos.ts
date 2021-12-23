import {vec2} from 'gl-matrix';

import {Viewport} from '../Viewport';

export function getMouseEventPos(
  viewport: Viewport,
  event: MouseEvent,
): vec2 {
  const canvasBounds = viewport.canvas.getBoundingClientRect();
  const targetX = Math.floor(event.clientX - canvasBounds.left);
  const targetY = Math.floor(
    canvasBounds.height - (event.clientY - canvasBounds.top),
  );
  return vec2.fromValues(targetX, targetY);
}

export function getNDCPos(
  viewport: Viewport,
  pixels: vec2,
  outputNDC: vec2,
): vec2 {
  const canvasBounds = viewport.canvas.getBoundingClientRect();
  vec2.set(
    outputNDC,
    (pixels[0] / canvasBounds.width - 0.5) * 2,
    (pixels[1] / canvasBounds.height - 0.5) * 2,
  );
  return outputNDC;
}

export function getMouseEventNDCPos(
  viewport: Viewport,
  event: MouseEvent,
  outputNDC: vec2,
): vec2 {
  const pixels = getMouseEventPos(viewport, event);
  return getNDCPos(viewport, pixels, outputNDC);
}
