import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';

export class Renderer {
  gl: WebGLRenderingContext;
  vaoExt: OES_vertex_array_object | null;
  instanceExt: ANGLE_instanced_arrays | null;
  uintExt: OES_element_index_uint | null;
  attributeManager: GLAttributeManager;
  textureManager: GLTextureManager;
  boundArrayBuffer: GLArrayBuffer | null = null;
  boundElementArrayBuffer: GLElementArrayBuffer | null = null;
  boundVertexArray: GLVertexArray | null = null;
  boundShader: GLShader | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
    this.instanceExt = gl.getExtension('ANGLE_instanced_arrays');
    this.uintExt = gl.getExtension('OES_element_index_uint');
    this.attributeManager = new GLAttributeManager(this);
    this.textureManager = new GLTextureManager(this);
  }
}
