import {GLGeometry, GLGeometryOptions} from './gl/GLGeometry';
import {Renderer} from './Renderer';
import {createId} from './utils/createId';

export class Geometry {
  id: number;
  options: GLGeometryOptions;
  constructor(options: GLGeometryOptions) {
    this.id = createId();
    this.options = options;
  }

  getGLGeometry(renderer: Renderer): GLGeometry {
    return renderer.getResource(
      this.id,
      () => new GLGeometry(this.options),
    );
  }
}
