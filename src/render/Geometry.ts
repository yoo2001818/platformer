import {GeometryOptions} from '../geom/types';

import {GLGeometry} from './gl/GLGeometry';
import {Renderer} from './Renderer';
import {createId} from './utils/createId';

export interface GeometryBounds {
  min: number[];
  max: number[];
}

export class Geometry {
  id: number;
  options: GeometryOptions;
  bounds: GeometryBounds | null = null;
  constructor(options: GeometryOptions, bounds: GeometryBounds | null = null) {
    this.id = createId();
    this.options = options;
    this.bounds = bounds;
  }

  getGLGeometry(renderer: Renderer): GLGeometry {
    return renderer.getResource(
      this.id,
      () => new GLGeometry(this.options),
    );
  }

  getBounds(): GeometryBounds {
    if (this.bounds == null) {
      const {data, size} = this.options.attributes.aPosition;
      const min: number[] = [];
      const max: number[] = [];
      for (let i = 0; i < data.length; i += size) {
        for (let j = 0; j < size; j += 1) {
          if (i === 0) {
            min[j] = data[i + j];
            max[j] = data[i + j];
          } else {
            min[j] = Math.min(min[j], data[i + j]);
            max[j] = Math.max(max[j], data[i + j]);
          }
        }
      }
      this.bounds = {min, max};
    }
    return this.bounds;
  }
}
