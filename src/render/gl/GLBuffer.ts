import type {Renderer} from './Renderer';
import {ArrayBufferView, BufferValue, GLAttributeType} from './types';
import {flattenBuffer, inferBufferType} from './utils';

const USAGE_MAP = {
  static: 0x88E4,
  stream: 0x88E0,
  dynamic: 0x88E8,
} as const;

export type UsageType = keyof typeof USAGE_MAP;

export class GLBuffer {
  type: number;
  usage: number;
  dataType: GLAttributeType | null = null;
  byteLength: number | null = null;
  initialValue: ArrayBufferLike | ArrayBufferView | null;
  renderer: Renderer | null = null;
  buffer: WebGLBuffer | null = null;

  constructor(
    type: number,
    initialValue?: BufferValue | null,
    usage: UsageType = 'static',
  ) {
    this.type = type;
    this.usage = USAGE_MAP[usage];
    this.initialValue =
      initialValue != null ? this._flatten(initialValue) : null;
    this.dataType = inferBufferType(initialValue);
    this.byteLength =
      this.initialValue != null ? this.initialValue.byteLength : null;
  }

  _flatten(value: BufferValue): ArrayBufferLike | ArrayBufferView {
    return flattenBuffer(value);
  }

  bind(renderer: Renderer): void {
    throw new Error('Not implemented');
  }

  dispose(): void {
    const {renderer, buffer} = this;
    if (renderer != null && buffer != null) {
      renderer.gl.deleteBuffer(buffer);
      this.buffer = null;
      this.renderer = null;
    }
  }

  set(value: BufferValue | null): void {
    this.initialValue = value != null ? this._flatten(value) : null;
    this.dataType = inferBufferType(value);
    this.byteLength =
      this.initialValue != null ? this.initialValue.byteLength : null;
    if (this.buffer != null && value != null) {
      this.bufferData(value);
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
    this.byteLength = size;
  }

  bufferData(input: BufferValue): void {
    const {renderer, type, usage} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    const {gl} = renderer;
    const flattened = this._flatten(input);
    gl.bufferData(type, flattened, usage);
    this.dataType = inferBufferType(input);
    this.byteLength = flattened.byteLength;
  }

  bufferSubData(offset: number, input: BufferValue): void {
    const {renderer, type} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    const {gl} = renderer;
    gl.bufferSubData(type, offset, this._flatten(input));
    if (this.dataType == null) {
      this.dataType = inferBufferType(input);
    }
  }
}
