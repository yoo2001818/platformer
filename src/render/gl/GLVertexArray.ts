import {Renderer} from './Renderer';

export class GLVertexArray {
  renderer: Renderer | null = null;
  vao: WebGLVertexArrayObjectOES | null = null;

  // TODO: This can be refactored to separate non-VAO and VAO variant
  constructor() {
  }

  bind(renderer: Renderer): void {
    if (renderer.vaoExt == null) {
      throw new Error('VAO is not supported');
    }
    if (this.vao == null) {
      this.renderer = renderer;
      this.vao = renderer.vaoExt.createVertexArrayOES();
    }
    if (renderer.boundVertexArray !== this) {
      renderer.vaoExt.bindVertexArrayOES(vao);
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
