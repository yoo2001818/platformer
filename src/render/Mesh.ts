import {Geometry, GeometryBounds} from './Geometry';
import {Material} from './Material';

export interface MeshOptions {
  castShadow?: boolean;
  castRay?: boolean;
}

export class Mesh {
  materials: Material[];
  geometries: Geometry[];
  options: MeshOptions;
  bounds: GeometryBounds | null = null;
  boundPoints: number[][] | null = null;

  constructor(
    material: Material | Material[],
    geometry: Geometry | Geometry[],
    options: MeshOptions = {},
  ) {
    this.materials = Array.isArray(material) ? material : [material];
    this.geometries = Array.isArray(geometry) ? geometry : [geometry];
    this.options = options;
  }

  shouldCastShadow(): boolean {
    return this.options.castShadow !== false;
  }

  getBounds(): GeometryBounds {
    if (this.bounds == null) {
      const min: number[] = [];
      const max: number[] = [];
      for (let i = 0; i < this.geometries.length; i += 1) {
        const bounds = this.geometries[i].getBounds();
        for (let j = 0; j < bounds.min.length; j += 1) {
          if (i === 0) {
            min[j] = bounds.min[j];
            max[j] = bounds.max[j];
          } else {
            min[j] = Math.min(min[j], bounds.min[j]);
            max[j] = Math.max(max[j], bounds.max[j]);
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

  toJSON(): unknown {
    return {};
  }
}
