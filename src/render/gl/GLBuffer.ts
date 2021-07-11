type ArrayBufferView =
  | ArrayBufferLike
  | Int8Array
  | Uint8Array
  | Uint8ClampedArray
  | Int16Array
  | Uint16Array
  | Int32Array
  | Uint32Array
  | Float32Array
  | Float64Array
  | DataView;

export class GLBuffer {
  type: number;
  gl: WebGLRenderingContext;
  buffer: WebGLBuffer;
  isBound: boolean;

  constructor(type: number, gl: WebGLRenderingContext) {
    this.type = type;
    this.gl = gl;
    this.isBound = false;
    this.init();
  }

  init(): void {
    const {gl} = this;
    this.buffer = gl.createBuffer();
  }

  dispose(): void {
    const {gl, buffer} = this;
    gl.deleteBuffer(buffer);
  }

  bind(): void {
    if (!this.isBound) {
      const {gl, buffer, type} = this;
      gl.bindBuffer(type, buffer);
      this.isBound = true;
    }
  }

  unbind(): void {
    this.isBound = false;
  }

  bufferDataEmpty(size: number, usage?: number): void {
    const {gl, type} = this;
    gl.bufferData(type, size, usage ?? gl.DYNAMIC_DRAW);
  }

  bufferData(input: ArrayBufferView, usage?: number): void {
    const {gl, type} = this;
    gl.bufferData(type, input, usage ?? gl.STATIC_DRAW);
  }

  bufferSubData(offset: number, input: ArrayBufferView): void {
    const {gl, type} = this;
    gl.bufferSubData(type, offset, input);
  }
}
