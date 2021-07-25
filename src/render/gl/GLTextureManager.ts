import type {GLTexture} from './GLTexture';
import {GLRenderer} from './GLRenderer';

export class GLTextureManager {
  renderer: GLRenderer;
  boundTextures: (GLTexture | null)[];
  boundVersion: number;
  activeId: number;

  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
    this.boundTextures = [];
    this.boundVersion = 0;
    this.activeId = 0;
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

  bind(texture: GLTexture): number {
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
    }
    // Bind the texture...
    this.boundTextures[slotId] = texture;
    texture._bind(this.renderer, slotId, slotVersion);
    return slotId;
  }
}
