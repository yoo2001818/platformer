import {Renderer} from './Renderer';
import {ArrayBufferView, BufferValue} from './types';
import {flattenBuffer} from './utils';

const USAGE_MAP = {
  static: 0x88E4,
  stream: 0x88E0,
  dynamic: 0x88E8,
} as const;

export type UsageType = keyof typeof USAGE_MAP;

export class GLBuffer {
  type: number;
  usage: number;
  initialValue: ArrayBufferView | ArrayBufferLike | null;
  renderer: Renderer | null = null;
  buffer: WebGLBuffer | null = null;
  isBound = false;

  constructor(
    type: number,
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    this.type = type;
    this.usage = USAGE_MAP[usage];
    this.initialValue =
      initialValue != null ? flattenBuffer(initialValue) : null;
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
      const {buffer, type} = this;
      renderer.gl.bindBuffer(type, buffer);
      this.isBound = true;
    }
  }

  unbind(): void {
    this.isBound = false;
  }

  dispose(): void {
    const {renderer, buffer} = this;
    if (renderer != null && buffer != null) {
      renderer.gl.deleteBuffer(buffer);
      this.buffer = null;
      this.renderer = null;
    }
  }

  bufferDataEmpty(size: number): void {
    const {renderer, type, usage} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferData(type, size, usage);
  }

  bufferData(input: BufferValue): void {
    const {renderer, type, usage} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferData(type, flattenBuffer(input), usage);
  }

  bufferSubData(offset: number, input: BufferValue): void {
    const {renderer, type} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferSubData(type, offset, flattenBuffer(input));
  }
}
