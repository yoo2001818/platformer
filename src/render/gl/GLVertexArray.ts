import {GLRenderer} from './GLRenderer';

export class GLVertexArray {
  renderer: GLRenderer | null = null;
  vao: WebGLVertexArrayObjectOES | null = null;

  // TODO: This can be refactored to separate non-VAO and VAO variant
  constructor() {
  }

  bind(renderer: GLRenderer): void {
    if (renderer.vaoExt == null) {
      throw new Error('VAO is not supported');
    }
    if (this.vao == null) {
      this.renderer = renderer;
      this.vao = renderer.vaoExt.createVertexArrayOES();
    }
    if (renderer.boundVertexArray !== this) {
      renderer.vaoExt.bindVertexArrayOES(this.vao);
      renderer.boundVertexArray = this;
    }
  }

  dispose(): void {
    const {renderer, vao} = this;
    if (renderer != null && vao != null) {
      renderer.vaoExt!.deleteVertexArrayOES(vao);
    }
  }

}
