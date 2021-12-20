import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLTexture2D} from './gl/GLTexture2D';
import {Renderer} from './Renderer';
import {Atlas, AtlasItem} from './Atlas';

export class ShadowMapManager {
  texture: GLTexture2D;
  frameBuffer: GLFrameBuffer;
  renderer: Renderer;
  atlas: Atlas;

  constructor(renderer: Renderer) {
    this.renderer = renderer;
    const useFloat = false;
    this.texture = new GLTexture2D({
      format: 'rgba',
      type: useFloat ? 'float' : 'halfFloat',
      width: 1,
      height: 1,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
      anistropic: 1,
    });
    this.frameBuffer = new GLFrameBuffer({
      color: this.texture,
    });
    this.atlas = new Atlas();
  }

  _updateTexture(): void {
    if (this.atlas.isResized) {
      const width = this.atlas.getWidth();
      const height = this.atlas.getHeight();
      this.texture.updateSize(width, height);
      this.atlas.isResized = false;
    }
  }

  getWidth(): number {
    return this.atlas.getWidth();
  }

  getHeight(): number {
    return this.atlas.getHeight();
  }

  getTexture(): GLTexture2D {
    this._updateTexture();
    return this.texture;
  }

  getFrameBuffer(): GLFrameBuffer {
    this._updateTexture();
    return this.frameBuffer;
  }

  getAtlas(
    item: AtlasItem | null | undefined,
    width: number,
    height: number,
  ): AtlasItem {
    if (item != null) {
      return item;
    }
    return this.atlas.allocate(width, height);
  }

  getUV(item: AtlasItem): number[] {
    const width = this.getWidth();
    const height = this.getHeight();
    return [
      item.x / width,
      item.y / height,
      item.width / width,
      item.height / height,
    ];
  }

  release(item: AtlasItem): void {
    this.atlas.release(item);
  }
}
