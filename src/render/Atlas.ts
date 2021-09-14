import {createId} from './utils/createId';

interface AtlasBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  left: AtlasBlock | null;
  right: AtlasBlock | null;
  item: AtlasItem | null;
}

export interface AtlasItem {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  isUpdated: boolean;
}

function createAtlasBlock(
  x: number, y: number, width: number, height: number,
): AtlasBlock {
  return {
    x,
    y,
    width,
    height,
    left: null,
    right: null,
    item: null,
  };
}

function nearestPow2(val: number): number {
  return 2 ** Math.ceil(Math.log2(val));
}

/**
 * This class retrieves various atlas requests and packs them into single
 * texture, while returning the position of packed atlas and notifying
 * whether if update is required or not.
 */
export class Atlas {
  root: AtlasBlock | null;
  freeBlocks: Set<AtlasBlock>;
  isResized: boolean;

  constructor() {
    this.root = null;
    this.freeBlocks = new Set();
    this.isResized = false;
  }

  getWidth(): number {
    return this.root?.width ?? 0;
  }

  getHeight(): number {
    return this.root?.height ?? 0;
  }

  _tryAllocate(block: AtlasBlock, item: AtlasItem): boolean {
    // Size check
    if (block.width < item.width || block.height < item.height) {
      return false;
    }
    this.freeBlocks.delete(block);
    // Perfect fit
    if (block.width === item.width && block.height === item.height) {
      block.item = item;
      item.x = block.x;
      item.y = block.y;
      return true;
    }
    // Try to separate it in three nodes if it doesn't match exactly.
    const wDiff = block.width - item.width;
    const hDiff = block.height - item.height;
    if (wDiff > hDiff) {
      // Split it horizontally
      block.left =
        createAtlasBlock(block.x, block.y, item.width, block.height);
      block.right =
        createAtlasBlock(block.x + item.width, block.y, wDiff, block.height);
      this.freeBlocks.add(block.right);
      return this._tryAllocate(block.left, item);
    } else {
      // Split it vertically
      block.left =
        createAtlasBlock(block.x, block.y, block.width, item.height);
      block.right =
        createAtlasBlock(block.x, block.y + item.height, block.width, hDiff);
      this.freeBlocks.add(block.right);
      return this._tryAllocate(block.left, item);
    }
  }

  allocate(width: number, height: number): AtlasItem {
    const item: AtlasItem = {
      id: createId(),
      x: 0,
      y: 0,
      width,
      height,
      isUpdated: true,
    };
    if (this.root == null) {
      // Build a new atlas block with it
      const pw = nearestPow2(width);
      const ph = nearestPow2(height);
      const root = createAtlasBlock(0, 0, pw, ph);
      this.isResized = true;
      this.root = root;
      this.freeBlocks.add(root);
    }
    // Scan free blocks and consume it if it fits.
    for (const block of this.freeBlocks) {
      if (this._tryAllocate(block, item)) {
        return item;
      }
    }
    // Nothing fits! Expand the root block to make room for it.
    const oldRoot = this.root;
    if (oldRoot.width + item.width < oldRoot.height + item.height) {
      // Expand it horizontally
      const newWidth = nearestPow2(oldRoot.width + item.width);
      const newHeight = nearestPow2(Math.max(item.height, oldRoot.height));
      const newRoot =
        createAtlasBlock(0, 0, newWidth, newHeight);
      if (newHeight !== oldRoot.height) {
        // Split it vertically...
        const splitted = createAtlasBlock(0, 0, oldRoot.width, newHeight);
        splitted.left = oldRoot;
        splitted.right = createAtlasBlock(
          0,
          oldRoot.height,
          oldRoot.width,
          newHeight - oldRoot.height,
        );
        this.freeBlocks.add(splitted.right);
      }
      newRoot.right = createAtlasBlock(
        oldRoot.width,
        0,
        newWidth - oldRoot.width,
        newHeight,
      );
      this._tryAllocate(newRoot.right, item);
      this.isResized = true;
      this.root = newRoot;
      return item;
    } else {
      // Expand it vertically
      const newWidth = nearestPow2(Math.max(item.width, oldRoot.width));
      const newHeight = nearestPow2(oldRoot.height + item.height);
      const newRoot = createAtlasBlock(0, 0, newWidth, newHeight);
      if (newWidth !== oldRoot.width) {
        // Split it horizontally...
        const splitted = createAtlasBlock(0, 0, newWidth, oldRoot.height);
        splitted.left = oldRoot;
        splitted.right = createAtlasBlock(
          oldRoot.width,
          0,
          newWidth - oldRoot.width,
          oldRoot.height,
        );
        this.freeBlocks.add(splitted.right);
      }
      newRoot.right = createAtlasBlock(
        0,
        oldRoot.height,
        newWidth,
        newHeight - oldRoot.height,
      );
      this._tryAllocate(newRoot.right, item);
      this.isResized = true;
      this.root = newRoot;
      return item;
    }
  }

  release(item: AtlasItem): void {
    // It's noop at this point
  }
}
