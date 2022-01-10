import {getBVHTexture} from '../bvhResource';
import {GLFrameBuffer} from '../gl/GLFrameBuffer';
import {GLTexture2D} from '../gl/GLTexture2D';
import {Renderer} from '../Renderer';

import {ProbeGrid, ProbeGridOptions} from './ProbeGrid';

export class RaytracedProbeGrid implements ProbeGrid {
  options: ProbeGridOptions;
  rtTexture: GLTexture2D | null = null;
  rtFrameBuffer: GLFrameBuffer | null = null;
  giTexture: GLTexture2D | null = null;
  giFrameBuffer: GLFrameBuffer | null = null;
  isValid = false;

  constructor() {
    this.options = {size: [0, 0, 0]};
    this.isValid = false;
  }

  dispose(): void {
    this.rtTexture?.dispose();
    this.rtFrameBuffer?.dispose();
    this.giTexture?.dispose();
    this.giFrameBuffer?.dispose();
  }

  setOptions(options: ProbeGridOptions): void {
    this.options = options;
    this.isValid = false;
  }

  getTexture(): GLTexture2D {
    const giTexture = this.giTexture;
    if (giTexture == null) {
      throw new Error('You must call prepare() before calling this.');
    }
    return giTexture;
  }

  _prepareTexture(renderer: Renderer): void {
    const {size} = this.options;
    if (this.rtTexture == null) {
      this.rtTexture = new GLTexture2D({
        format: 'rgba',
        type: 'halfFloat',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        magFilter: 'nearest',
        minFilter: 'nearest',
        mipmap: false,
        // X * numSamplesPerTick
        width: size[0],
        // Z * Y
        height: size[1] * size[2],
      });
    }
    if (this.rtFrameBuffer == null) {
      this.rtFrameBuffer = new GLFrameBuffer({
        color: this.rtTexture!,
      });
    }
    if (this.giTexture == null) {
      this.giTexture = new GLTexture2D({
        format: 'rgba',
        type: 'halfFloat',
        wrapS: 'clampToEdge',
        wrapT: 'clampToEdge',
        magFilter: 'linear',
        minFilter: 'linear',
        mipmap: false,
        // X * numSHVectors
        width: size[0] * 9,
        // Z * Y
        height: size[1] * size[2],
      });
    }
    if (this.giFrameBuffer == null) {
      this.giFrameBuffer = new GLFrameBuffer({
        color: this.giTexture!,
      });
    }
    if (this.isValid) {
      return;
    }
    this.rtTexture.updateSize(size[0], size[1] * size[2]);
    this.giTexture.updateSize(size[0] * 9, size[1] * size[2]);
    this.isValid = false;
  }

  prepare(renderer: Renderer): void {
    this._prepareTexture(renderer);
    const bvhTexture = getBVHTexture(renderer);
  }
}
