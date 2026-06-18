import { getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng, toSvg } from 'html-to-image';
import type { DeviceNode } from '../types';

const EXPORT_PADDING = 0.1;
const MAX_WIDTH = 2400;
const MAX_HEIGHT = 1600;

function downloadDataUrl(dataUrl: string, filename: string): void {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  link.click();
}

async function captureViewport(
  nodes: DeviceNode[],
  capture: (el: HTMLElement, width: number, height: number) => Promise<string>,
): Promise<string | null> {
  const viewportEl = document.querySelector<HTMLElement>('.react-flow__viewport');
  if (!viewportEl || nodes.length === 0) return null;

  const bounds = getNodesBounds(nodes);
  const width = Math.min(MAX_WIDTH, Math.max(800, bounds.width + 200));
  const height = Math.min(MAX_HEIGHT, Math.max(600, bounds.height + 200));
  const { x, y, zoom } = getViewportForBounds(bounds, width, height, 0.2, 2, EXPORT_PADDING);

  const previousTransform = viewportEl.style.transform;
  viewportEl.style.transform = `translate(${x}px, ${y}px) scale(${zoom})`;
  try {
    return await capture(viewportEl, width, height);
  } finally {
    viewportEl.style.transform = previousTransform;
  }
}

export async function exportCanvasAsPng(nodes: DeviceNode[]): Promise<void> {
  const dataUrl = await captureViewport(nodes, (el, width, height) =>
    toPng(el, { width, height, backgroundColor: '#071029', pixelRatio: 2 }),
  );
  if (dataUrl) downloadDataUrl(dataUrl, 'netmap.png');
}

export async function exportCanvasAsSvg(nodes: DeviceNode[]): Promise<void> {
  const dataUrl = await captureViewport(nodes, (el, width, height) =>
    toSvg(el, { width, height, backgroundColor: '#071029' }),
  );
  if (dataUrl) downloadDataUrl(dataUrl, 'netmap.svg');
}
