import {GLBuffer, UsageType} from './GLBuffer';
import type {Renderer} from './Renderer';
import {BufferValue} from './types';

const ARRAY_BUFFER = 0x8892;

export class GLArrayBuffer extends GLBuffer {
  constructor(
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    super(ARRAY_BUFFER, initialValue, usage);
  }

  bind(renderer: Renderer): void {
    if (this.buffer == null) {
      this.renderer = renderer;
      this.buffer = renderer.gl.createBuffer();
      renderer.gl.bindBuffer(this.type, this.buffer);
      if (this.initialValue != null) {
        this.bufferData(this.initialValue);
      }
      return;
    }
    if (renderer.boundArrayBuffer !== this) {
      const {buffer, type} = this;
      renderer.gl.bindBuffer(type, buffer);
      renderer.boundArrayBuffer = this;
    }
  }
}
