import {GLFrameBuffer} from './gl/GLFrameBuffer';
import {GLTexture2D} from './gl/GLTexture2D';
import {Renderer} from './Renderer';

export interface ShadowMapHandle {
  id: number;
  bounds: [number, number, number, number];
}

export class ShadowMapManager {
  texture: GLTexture2D;
  frameBuffer: GLFrameBuffer;
  width: number;
  height: number;

  constructor(renderer: Renderer) {
    // TODO: While I aim to implement VSM or any other methods, this comes first
    this.texture = new GLTexture2D({
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
    this.frameBuffer = new GLFrameBuffer({
      width: 2048,
      height: 2048,
      depth: this.texture,
    });
    this.width = 2048;
    this.height = 2048;
  }

  get(handle?: ShadowMapHandle | null): ShadowMapHandle {
    if (handle != null) {
      return handle;
    }
    // TODO Actually implement logic
    return {
      id: 1,
      bounds: [0, 0, 2048, 2048],
    };
  }

  release(handle: ShadowMapHandle): void {
    // TODO Actually implement logic
  }
}
