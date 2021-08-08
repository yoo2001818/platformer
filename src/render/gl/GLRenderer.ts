import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';
import {GLFrameBuffer} from './GLFrameBuffer';

export class GLRenderer {
  gl: WebGLRenderingContext;
  vaoExt: OES_vertex_array_object | null;
  instanceExt: ANGLE_instanced_arrays | null;
  uintExt: OES_element_index_uint | null;
  anisotropic: EXT_texture_filter_anisotropic | null;
  attributeManager: GLAttributeManager;
  textureManager: GLTextureManager;
  boundFrameBuffer: GLFrameBuffer | null = null;
  boundArrayBuffer: GLArrayBuffer | null = null;
  boundElementArrayBuffer: GLElementArrayBuffer | null = null;
  boundVertexArray: GLVertexArray | null = null;
  boundShader: GLShader | null = null;

  constructor(gl: WebGLRenderingContext) {
    this.gl = gl;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
    this.instanceExt = gl.getExtension('ANGLE_instanced_arrays');
    this.uintExt = gl.getExtension('OES_element_index_uint');
    this.anisotropic = gl.getExtension('EXT_texture_filter_anisotropic');
    this.attributeManager = new GLAttributeManager(this);
    this.textureManager = new GLTextureManager(this);
  }

  getAspectRatio(): number {
    const canvas = this.gl.canvas;
    return canvas.width / canvas.height;
  }

  setViewport(): void {
    const {gl} = this;
    const {canvas} = gl;
    gl.viewport(0, 0, canvas.width, canvas.height);
  }
}
