import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLTexture2D} from './gl/GLTexture2D';
import {Renderer} from './Renderer';

export interface ShadowMapHandle {
  id: number;
  bounds: [number, number, number, number];
}

export class ShadowMapManager {
  depthMap: GLTexture2D;
  texture: GLTexture2D;
  frameBuffer: GLFrameBuffer;
  width: number;
  height: number;
  id: number;

  constructor(renderer: Renderer) {
    this.depthMap = new GLTexture2D({
      format: 'depth',
      type: 'unsignedInt',
      // About 16MB
      width: 2048,
      height: 2048,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    this.texture = new GLTexture2D({
      format: 'rgba',
      type: 'float',
      // About 64MB
      width: 2048,
      height: 2048,
      magFilter: 'linear',
      minFilter: 'linear',
      wrapS: 'clampToEdge',
      wrapT: 'clampToEdge',
      mipmap: false,
    });
    this.frameBuffer = new GLFrameBuffer({
      width: 2048,
      height: 2048,
      depth: this.depthMap,
      color: this.texture,
    });
    this.width = 2048;
    this.height = 2048;
    this.id = 0;
  }

  get(handle?: ShadowMapHandle | null): ShadowMapHandle {
    if (handle != null) {
      return handle;
    }
    // TODO Actually implement logic
    const result: ShadowMapHandle = {
      id: this.id,
      bounds: [this.id * 512, 0, 512, 512],
    };
    this.id += 1;
    return result;
  }

  release(handle: ShadowMapHandle): void {
    // TODO Actually implement logic
  }
}
