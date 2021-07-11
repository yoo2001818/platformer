import {Renderer} from './Renderer';
import {ArrayBufferView, BufferValue} from './types';
import {flattenBuffer} from './utils';

const USAGE_MAP = {
  static: 0x88E4,
  stream: 0x88E0,
  dynamic: 0x88E8,
} as const;

type UsageType = keyof typeof USAGE_MAP;

export class GLBuffer {
  type: number;
  usage: number;
  initialValue: ArrayBufferView | ArrayBufferLike | null;
  renderer: Renderer | null;
  buffer: WebGLBuffer | null;
  isBound: boolean;

  constructor(
    type: number,
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    this.type = type;
    this.usage = USAGE_MAP[usage];
    this.initialValue = flattenBuffer(initialValue);
    this.isBound = false;
  }

  bind(renderer: Renderer): void {
    if (this.buffer == null) {
      this.renderer = renderer;
      this.buffer = renderer.gl.createBuffer();
      renderer.gl.bindBuffer(this.type, this.buffer);
      this.isBound = true;
      if (this.initialValue != null) {
        this.bufferData(this.initialValue);
      }
      return;
    }
    if (!this.isBound) {
      const {renderer, buffer, type} = this;
      renderer.gl.bindBuffer(type, buffer);
      this.isBound = true;
    }
  }

  unbind(): void {
    this.isBound = false;
  }

  dispose(): void {
    const {renderer, buffer} = this;
    if (this.renderer != null && this.buffer != null) {
      renderer.gl.deleteBuffer(buffer);
      this.buffer = null;
      this.renderer = null;
    }
  }

  bufferDataEmpty(size: number): void {
    const {renderer, type, usage} = this;
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferData(type, size, usage);
  }

  bufferData(input: ArrayBufferView | number[]): void {
    const {renderer, type, usage} = this;
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferData(type, input, usage);
  }

  bufferSubData(offset: number, input: ArrayBufferView | number[]): void {
    const {renderer, type, usage} = this;
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferSubData(type, offset, input);
  }
}
