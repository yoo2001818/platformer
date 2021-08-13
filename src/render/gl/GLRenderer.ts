import {GLArrayBuffer} from './GLArrayBuffer';
import {GLAttributeManager} from './GLAttributeManager';
import {GLTextureManager} from './GLTextureManager';
import {GLElementArrayBuffer} from './GLElementArrayBuffer';
import {GLVertexArray} from './GLVertexArray';
import {GLShader} from './GLShader';
import {GLFrameBuffer} from './GLFrameBuffer';
import {DrawOptions} from './types';

export class GLRenderer {
  gl: WebGLRenderingContext;
  vaoExt: OES_vertex_array_object | null;
  instanceExt: ANGLE_instanced_arrays | null;
  uintExt: OES_element_index_uint | null;
  anisotropicExt: EXT_texture_filter_anisotropic | null;
  depthTexExt: WEBGL_depth_texture | null;
  floatTexExt: OES_texture_float | null;
  floatTexLinearExt: OES_texture_float_linear | null;
  floatBufferExt: WEBGL_color_buffer_float | null;
  fboRenderMipmapExt: unknown | null;
  drawBuffersExt: WEBGL_draw_buffers | null;
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
    this.anisotropicExt = gl.getExtension('EXT_texture_filter_anisotropic');
    gl.getExtension('EXT_shader_texture_lod');
    this.depthTexExt = gl.getExtension('WEBGL_depth_texture');
    this.floatTexExt = gl.getExtension('OES_texture_float');
    this.floatTexLinearExt = gl.getExtension('OES_texture_float_linear');
    this.floatBufferExt = gl.getExtension('WEBGL_color_buffer_float');
    this.fboRenderMipmapExt = gl.getExtension('OES_fbo_render_mipmap');
    this.drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');

    this.attributeManager = new GLAttributeManager(this);
    this.textureManager = new GLTextureManager(this);
  }

  unbindFrameBuffer(): void {
    if (renderer.boundFrameBuffer != null) {
      renderer.boundFrameBuffer.unbind();
    }
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

  draw(options: DrawOptions): void {
    const {frameBuffer, geometry, shader, uniforms, primCount} = options;
    shader.prepareUniformTextures(this, uniforms);
    if (frameBuffer != null) {
      frameBuffer.bind(this);
    } else {
      this.unbindFrameBuffer();
    }
    shader.bind(this);
    geometry.bind(this, shader);
    shader.setUniforms(uniforms);
    if (primCount != null) {
      geometry.drawInstanced(primCount);
    } else {
      geometry.draw();
    }
  }
}
