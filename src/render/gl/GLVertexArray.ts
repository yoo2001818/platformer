import {Renderer} from './Renderer';

export class GLVertexArray {
  renderer: Renderer | null = null;
  vao: WebGLVertexArrayObjectOES | null = null;

  // TODO: This can be refactored to separate non-VAO and VAO variant
  constructor() {
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
