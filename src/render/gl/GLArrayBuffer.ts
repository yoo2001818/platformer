import {GLBuffer} from './GLBuffer';

export class GLArrayBuffer extends GLBuffer {
  constructor(gl: WebGLRenderingContext) {
    super(gl.ARRAY_BUFFER, gl);
  }
}
