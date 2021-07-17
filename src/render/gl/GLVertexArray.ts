import {Renderer} from './Renderer';
import {AttributeOptions} from './types';

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

  set(index: number, options: AttributeOptions): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    this.bind(renderer);
    renderer.attributeManager.set(index, options);
  }

  setStatic(index: number, array: Float32Array): void {
    const {renderer} = this;
    if (renderer == null) {
      throw new Error('Renderer is not supplied');
    }
    // NOTE: Actually, VAO doesn't store non-array vertex attributes. Still...
    this.bind(renderer);
    renderer.attributeManager.setStatic(index, array);
  }

}
