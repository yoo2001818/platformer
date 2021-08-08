import {Geometry} from './Geometry';
import {Material} from './Material';

export class Mesh {
  material: Material;
  geometry: Geometry;

  constructor(material: Material, geometry: Geometry) {
    this.material = material;
    this.geometry = geometry;
  }
}
