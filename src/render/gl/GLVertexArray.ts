export class GLVertexArray {
  gl: WebGLRenderingContext;
  vaoExt: OES_vertex_array_object | null;
  vao: WebGLVertexArrayObjectOES | null;
  isBound: boolean;

  // TODO: This can be refactored to separate non-VAO and VAO variant
  constructor(
    gl: WebGLRenderingContext,
    vaoExt: OES_vertex_array_object | null,
  ) {
    this.gl = gl;
    this.vaoExt = vaoExt;
    this.isBound = false;
    this.init();
  }

  init(): void {
    const {vaoExt} = this;
    if (vaoExt != null) {
      this.vao = vaoExt.createVertexArrayOES();
    }
  }

  dispose(): void {
    const {vaoExt, vao} = this;
    if (vaoExt != null && vao != null) {
      vaoExt.deleteVertexArrayOES(vao);
    }
  }

  bind(): void {
    if (!this.isBound) {
      const {vaoExt, vao} = this;
      if (vaoExt != null) {
        vaoExt.bindVertexArrayOES(vao);
      }
    }
  }
  
}
