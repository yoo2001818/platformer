import {BVH, createBVHFromGeometry} from '../3d/BVH';
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
  name: string;
  options: GeometryOptions;
  bounds: GeometryBounds | null = null;
  boundPoints: number[][] | null = null;
  bvh: BVH | null = null;
  constructor(
    name: string,
    options: GeometryOptions,
    bounds: GeometryBounds | null = null,
  ) {
    this.id = createId();
    this.name = name;
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

  getBoundPoints(): number[][] {
    if (this.boundPoints == null) {
      const {min, max} = this.getBounds();
      this.boundPoints = [
        min,
        [max[0], min[1], min[2]],
        [min[0], max[1], min[2]],
        [max[0], max[1], min[2]],
        [min[0], min[1], max[2]],
        [max[0], min[1], max[2]],
        [min[0], max[1], max[2]],
        max,
      ];
    }
    return this.boundPoints;
  }

  getBVH(): BVH {
    if (this.bvh == null) {
      this.bvh = createBVHFromGeometry(this.options);
    }
    return this.bvh;
  }
}
