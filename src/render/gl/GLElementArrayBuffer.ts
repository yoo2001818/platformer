import {GLBuffer, UsageType} from './GLBuffer';
import type {Renderer} from './Renderer';
import {ArrayBufferView, BufferValue} from './types';
import {parseIndices} from './utils';

const ELEMENT_ARRAY_BUFFER = 0x8893;

export class GLElementArrayBuffer extends GLBuffer {
  constructor(
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    super(ELEMENT_ARRAY_BUFFER, initialValue, usage);
  }

  _flatten(value: BufferValue): ArrayBufferLike | ArrayBufferView {
    return parseIndices(value);
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

