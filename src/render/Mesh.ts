import {Geometry} from './Geometry';
import {Material} from './Material';

export class Mesh {
  materials: Material[];
  geometries: Geometry[];

  constructor(
    material: Material | Material[],
    geometry: Geometry | Geometry[],
  ) {
    this.materials = Array.isArray(material) ? material : [material];
    this.geometries = Array.isArray(geometry) ? geometry : [geometry];
  }
}
