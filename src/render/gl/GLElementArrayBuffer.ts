import {GLBuffer} from './GLBuffer';

export class GLElementArrayBuffer extends GLBuffer {
  constructor(gl: WebGLRenderingContext) {
    super(gl.ELEMENT_ARRAY_BUFFER, gl);
  }
}
