import {GLArrayBuffer} from './GLArrayBuffer';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';

export class Renderer {
  gl: WebGLRenderingContext;
  vaoExt: OES_vertex_array_object | null;
  boundArrayBuffer: GLArrayBuffer | null = null;
  boundElementArrayBuffer: GLElementArrayBuffer | null = null;
  boundVertexArray: GLVertexArray | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
  }
}
