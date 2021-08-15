import type {GLRenderer} from './GLRenderer';

export class GLCapabilities {
  renderer: GLRenderer;
  isWebGL2 = false;
  vaoExt: OES_vertex_array_object | null = null;
  instanceExt: ANGLE_instanced_arrays | null = null;
  uintExt: OES_element_index_uint | null = null;
  anisotropicExt: EXT_texture_filter_anisotropic | null = null;
  depthTexExt: WEBGL_depth_texture | null = null;
  floatTexExt: OES_texture_float | null = null;
  floatTexLinearExt: OES_texture_float_linear | null = null;
  floatBufferExt: unknown | null = null;
  floatBlendExt: unknown | null = null;
  fboRenderMipmapExt: unknown | null = null;
  drawBuffersExt: WEBGL_draw_buffers | null = null;

  constructor(renderer: GLRenderer) {
    this.renderer = renderer;
    this.enableExtensions();
  }

  enableExtensions(): void {
    const {gl} = this.renderer;
    this.isWebGL2 = typeof WebGL2RenderingContext !== 'undefined' &&
      gl instanceof WebGL2RenderingContext;
    this.vaoExt = gl.getExtension('OES_vertex_array_object');
    this.instanceExt = gl.getExtension('ANGLE_instanced_arrays');
    this.uintExt = gl.getExtension('OES_element_index_uint');
    this.anisotropicExt = gl.getExtension('EXT_texture_filter_anisotropic');
    gl.getExtension('EXT_shader_texture_lod');
    this.depthTexExt = gl.getExtension('WEBGL_depth_texture');
    this.floatTexExt = gl.getExtension('OES_texture_float');
    this.floatTexLinearExt = gl.getExtension('OES_texture_float_linear');
    this.floatBufferExt =
      gl.getExtension('WEBGL_color_buffer_float') ||
      gl.getExtension('EXT_color_buffer_float');
    this.floatBlendExt = gl.getExtension('EXT_float_blend');
    this.fboRenderMipmapExt = gl.getExtension('OES_fbo_render_mipmap');
    this.drawBuffersExt = gl.getExtension('WEBGL_draw_buffers');
  }

  hasFloatTexture(): boolean {
    return this.isWebGL2 || this.floatTexExt != null;
  }

  hasFloatTextureLinear(): boolean {
    return this.floatTexLinearExt != null;
  }

  hasFloatBuffer(): boolean {
    return this.floatBufferExt != null;
  }

  hasFloatBlend(): boolean {
    return this.floatBlendExt != null;
  }
}
