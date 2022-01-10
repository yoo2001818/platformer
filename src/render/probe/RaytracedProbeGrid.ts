import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLTexture2D} from '../gl/GLTexture2D';
import {BVHTexture} from '../raytrace/BVHTexture';
import {Renderer} from '../Renderer';

import {ProbeGrid, ProbeGridOptions} from './ProbeGrid';

export class RaytracedProbeGrid implements ProbeGrid {
  options: ProbeGridOptions;
  bvhTexture: BVHTexture;
  rtTexture: GLTexture2D | null = null;
  rtFrameBuffer: GLFrameBuffer | null = null;
  giTexture: GLTexture2D | null = null;
  giFrameBuffer: GLFrameBuffer | null = null;

  constructor(bvhTexture: BVHTexture) {
    this.bvhTexture = bvhTexture;
    this.options = {size: [0, 0, 0]};
  }

  dispose(): void {
    this.rtTexture?.dispose();
    this.rtFrameBuffer?.dispose();
    this.giTexture?.dispose();
    this.giFrameBuffer?.dispose();
  }

  setOptions(options: ProbeGridOptions): void {
    this.options = options;
  }

  getTexture(): GLTexture2D {
    const giTexture = this.giTexture;
    if (giTexture == null) {
      throw new Error('You must call prepare() before calling this.');
    }
    return giTexture;
  }

  prepare(renderer: Renderer): void {
    throw new Error('Method not implemented.');
  }
}
