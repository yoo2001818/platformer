import type {GLTexture} from './GLTexture';
import {GLRenderer} from './GLRenderer';

export class GLTextureManager {
  renderer: GLRenderer;
  boundTextures: (GLTexture | null)[];
  boundVersion: number;
  activeId: number;
  pendingTextures: Set<GLTexture>;

  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
    this.boundTextures = [];
    this.boundVersion = 0;
    this.activeId = -1;
    this.pendingTextures = new Set();
    this.init();
  }

  init(): void {
    const {gl} = this.renderer;
    const numTextures = gl.getParameter(gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    this.boundTextures = [];
    for (let i = 0; i < numTextures; i += 1) {
      this.boundTextures[i] = null;
    }
    this.boundVersion = 0;
  }

  notifyUnbind(id: number, version: number): void {
    const texture = this.boundTextures[id];
    if (
      texture != null &&
      texture.boundVersion != null &&
      texture.boundVersion <= version
    ) {
      this.boundTextures[id] = null;
    }
  }

  bind(original: GLTexture): number {
    // The texture can return other instances when it's not ready. Therefore,
    // we check the readiness in here.
    if (!original.isReady()) {
      this.addPending(original);
    } else {
      this.removePending(original);
    }
    const texture = original._getInstance(this.renderer);
    // Check if the texture is already bound....
    if (
      texture.boundId != null &&
      this.boundTextures[texture.boundId] === texture
    ) {
      texture.boundVersion = this.boundVersion;
      this.boundVersion += 1;
      texture._bindTick();
      return texture.boundId;
    }
    // Find next applicable slot. it'll favor unused slot first, then the slot
    // with the least version.
    let slotId = 0;
    let slotVersion = 0;
    this.boundTextures.every((texture, index) => {
      if (texture == null) {
        slotId = index;
        return false;
      }
      const {boundVersion} = texture;
      if (boundVersion != null && boundVersion < slotVersion) {
        slotId = index;
        slotVersion = boundVersion;
      }
      return true;
    });
    const prevTexture = this.boundTextures[slotId];
    if (prevTexture != null) {
      prevTexture._unbind();
      this.activeId = -1;
    }
    // Bind the texture...
    this.boundTextures[slotId] = texture;
    texture._bind(this.renderer, slotId, slotVersion);
    return slotId;
  }

  addPending(texture: GLTexture): void {
    this.pendingTextures.add(texture);
  }

  removePending(texture: GLTexture): void {
    this.pendingTextures.delete(texture);
  }

  hasPendingResolved(): boolean {
    let hasResolved = false;
    for (const entry of this.pendingTextures) {
      if (entry.isReady()) {
        hasResolved = true;
        this.pendingTextures.delete(entry);
      }
    }
    return hasResolved;
  }
}
